import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import CouponInput from '~/components/Checkout/CouponInput.vue'
import WebsideCouponInput from '~/components/variants/webside/Checkout/CouponInput.vue'
import type { CartDetail } from '~~/shared/openapi/types.gen'
import { makeCart } from '~~/test/fixtures/cart'
import type { CartOverrides } from '~~/test/fixtures/cart'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'
import { failWith } from '~~/test/helpers/api'

/**
 * The coupon field at checkout. A code goes to Django (`POST
 * /api/cart/coupon`), the cart is re-read, and the applied code shows
 * what IT earned. The widget is a commercial feature behind two gates —
 * the tenant's plan and the merchant's runtime setting — and fails
 * CLOSED on both.
 *
 * One `createApiMock` answers `$api` (the POST/DELETE, the cart
 * refresh) and `$fetch` (the `useApi` settings payload and the coupon
 * picker's list), so every request the widget makes is visible here.
 * The cart is the real Pinia store.
 *
 * The frozen webside copy differs only in rendering the prefixed
 * `WebsideCheckoutCouponPicker`.
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const flags = vi.hoisted(() => ({ promotionsSetting: 'true' as string | null }))

/** The cart Django returns after the request under test. */
let cartAfter: CartDetail

function routes(extra: Record<string, unknown> = {}) {
  api.routes({
    '/api/settings/public': () => {
      if (flags.promotionsSetting === null) throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 })
      return { settings: { PROMOTIONS_ENABLED: flags.promotionsSetting } }
    },
    '/api/cart': () => cartAfter,
    '/api/cart/coupons': [],
    ...extra,
  })
}

function reject(data: Record<string, unknown> | undefined) {
  return failWith(400, data)
}

const t = (key: string, params: Record<string, unknown> = {}): string => useNuxtApp().$i18n.t(key, params)
const text = (wrapper: VueWrapper) => wrapper.text().replace(/\u00A0/g, ' ')

function withCoupon(code: string, amount: number | null, overrides: CartOverrides = {}): CartOverrides {
  return {
    appliedCouponCodes: [code],
    appliedPromotions: amount === null ? [] : [{ promotionId: 3, name: '-5€ σε αγορές από 49€', code, amount }],
    ...overrides,
  }
}

describe.each(trees(CouponInput, WebsideCouponInput))('$tree Checkout/CouponInput', ({ C, own }) => {
  beforeEach(() => {
    clearNuxtData()
    useToast().clear()
    flags.promotionsSetting = 'true'
    setTenant({ promotionsEnabled: true })
    useCartStore().cart = makeCart()
    cartAfter = makeCart()
    routes()
  })

  async function mount() {
    const wrapper = await mountSuspended(C, { route: false })
    // `useSettingFlag` reads an un-awaited `useApi`; the mock answers at once.
    await flushPromises()
    return wrapper
  }

  async function submitCode(wrapper: VueWrapper, code: string) {
    await wrapper.find('input').setValue(code)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  const toasts = () => useToast().toasts.value

  describe('applying a code', () => {
    it('sends the trimmed code, re-reads the cart and shows the code as applied', async () => {
      cartAfter = makeCart(withCoupon('WELCOME10', 5))
      const wrapper = await mount()

      await submitCode(wrapper, '  WELCOME10 ')

      expect(api.callsTo('/api/cart/coupon')).toEqual([
        { url: '/api/cart/coupon', options: expect.objectContaining({ method: 'POST', body: { code: 'WELCOME10' } }) },
      ])
      expect(api.callsTo('/api/cart').at(-1)!.options).toMatchObject({ method: 'GET' })
      expect(wrapper.find('form').exists()).toBe(false)
      expect(text(wrapper)).toContain('WELCOME10')
      expect(text(wrapper)).toContain('-5,00 €')
    })

    it('confirms with the discount the code earned', async () => {
      cartAfter = makeCart(withCoupon('WELCOME10', 5))
      const wrapper = await mount()

      await submitCode(wrapper, 'WELCOME10')

      expect(toasts()).toHaveLength(1)
      expect(toasts()[0]).toMatchObject({ color: 'success', title: 'Το κουπόνι εφαρμόστηκε' })
      expect(String(toasts()[0]!.description).replace(/\u00A0/g, ' ')).toBe('Έκπτωση 5,00 €')
    })

    it('says so when the code took nothing off because a better offer applies', async () => {
      cartAfter = makeCart(withCoupon('WELCOME10', null))
      const wrapper = await mount()

      await submitCode(wrapper, 'WELCOME10')

      expect(toasts()[0]!.description).toBe('Δεν μείωσε το σύνολο — ισχύει ήδη καλύτερη προσφορά')
    })

    it('keeps the apply button disabled until something other than spaces is typed', async () => {
      const wrapper = await mount()
      const apply = () => wrapper.find('button[type="submit"]')
      expect(apply().attributes()).toHaveProperty('disabled')

      await wrapper.find('input').setValue('   ')
      expect(apply().attributes()).toHaveProperty('disabled')

      await wrapper.find('input').setValue('SAVE5')
      expect(apply().attributes()).not.toHaveProperty('disabled')
    })

    it('refuses a code shorter than three characters without asking Django', async () => {
      const wrapper = await mount()

      await submitCode(wrapper, 'AB')

      expect(api.callsTo('/api/cart/coupon')).toEqual([])
      await vi.waitFor(() => expect(text(wrapper)).toContain('Ο κωδικός είναι πολύ σύντομος'))
    })
  })

  describe('a refused code', () => {
    it.each([
      ['Django\'s machine-readable reason, translated', { detail: 'refused', reason: 'discount_code_minimum_not_met' }, (): string => t('promotion.rejection.discount_code_minimum_not_met')],
      ['Django\'s detail when it gives no reason', { detail: 'Ο κωδικός έχει λήξει' }, (): string => 'Ο κωδικός έχει λήξει'],
      ['the generic refusal when the error carries nothing', undefined, (): string => t('promotion.rejection.generic')],
    ])('shows %s', async (_case, data, expected) => {
      routes({ '/api/cart/coupon': reject(data) })
      const wrapper = await mount()

      await submitCode(wrapper, 'WELCOME10')

      expect(text(wrapper)).toContain(expected())
      expect(wrapper.find('form').exists()).toBe(true)
    })

    it('clears the refusal once the picker applies a coupon', async () => {
      routes({ '/api/cart/coupon': reject({ reason: 'discount_code_expired' }) })
      const wrapper = await mount()
      await submitCode(wrapper, 'OLD')
      expect(text(wrapper)).toContain(t('promotion.rejection.discount_code_expired'))

      wrapper.findComponent({ name: own('CheckoutCouponPicker') }).vm.$emit('applied', 'SAVE5')
      await flushPromises()

      expect(text(wrapper)).not.toContain(t('promotion.rejection.discount_code_expired'))
    })
  })

  describe('an applied code', () => {
    it('shows the coupon its OWN amount, not the cart\'s total discount', async () => {
      // Two automatic offers worth 34,98 plus a 5,00 code. The row used
      // to read -39,98 for SAVE5 — the cart's whole discount credited to
      // the coupon.
      useCartStore().cart = makeCart({
        promotionDiscount: 39.98,
        appliedCouponCodes: ['SAVE5'],
        appliedPromotions: [
          { promotionId: 4, name: '-15% στην κατηγορία', code: null, amount: 14.99 },
          { promotionId: 5, name: '2+1 δώρο', code: null, amount: 19.99 },
          { promotionId: 3, name: '-5€ σε αγορές από 49€', code: 'SAVE5', amount: 5 },
        ],
      })
      const wrapper = await mount()

      expect(text(wrapper)).toContain('SAVE5')
      expect(text(wrapper)).toContain('-5,00 €')
      expect(text(wrapper)).not.toContain('39,98')
      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('says a code earned nothing when a better offer won', async () => {
      // The code lost the stacking comparison, so it has no entry.
      useCartStore().cart = makeCart({
        promotionDiscount: 30,
        appliedCouponCodes: ['SAVE5'],
        appliedPromotions: [{ promotionId: 9, name: 'Μεγάλη προσφορά', code: null, amount: 30 }],
      })
      const wrapper = await mount()

      expect(text(wrapper)).toContain('SAVE5')
      expect(text(wrapper)).toContain('Ισχύει καλύτερη προσφορά')
      expect(text(wrapper)).not.toContain('30,00')
    })

    it('removes the code from the alert\'s close button and offers the field again', async () => {
      useCartStore().cart = makeCart(withCoupon('SAVE5', 5))
      cartAfter = makeCart()
      const wrapper = await mount()

      await wrapper.find('[data-slot="close"]').trigger('click')
      await flushPromises()

      expect(api.callsTo('/api/cart/coupon')).toEqual([
        { url: '/api/cart/coupon', options: expect.objectContaining({ method: 'DELETE' }) },
      ])
      expect(wrapper.find('form').exists()).toBe(true)
      expect(text(wrapper)).not.toContain('SAVE5')
    })
  })

  describe('the feature gates (fail closed)', () => {
    it('renders nothing on a plan without promotions', async () => {
      setTenant({ promotionsEnabled: false })
      const wrapper = await mount()

      expect(wrapper.html()).not.toContain('Κουπόνι έκπτωσης')
      expect(wrapper.find('form').exists()).toBe(false)
    })

    it.each([
      ['turned the setting off', 'false'],
      ['never set it', ''],
    ])('renders nothing when the merchant %s', async (_case, setting) => {
      flags.promotionsSetting = setting
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('renders nothing when the settings lookup fails', async () => {
      flags.promotionsSetting = null
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(false)
    })
  })

  describe('wholesale carts', () => {
    const wholesale = (allowPromotions: boolean, appliedCouponCodes: string[] = []) => makeCart({
      appliedCouponCodes,
      b2bPricing: { applied: true, groupName: 'Wholesale', allowPromotions, allowLoyalty: false },
    })

    it('hides the field, because Django refuses new codes on a wholesale cart', async () => {
      useCartStore().cart = wholesale(false)
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('keeps the widget when a code is already attached, so it can be removed', async () => {
      useCartStore().cart = wholesale(false, ['WELCOME10'])
      const wrapper = await mount()

      expect(text(wrapper)).toContain('WELCOME10')
      expect(wrapper.find('[data-slot="close"]').exists()).toBe(true)
    })

    it('shows the field when the merchant lets promotions stack', async () => {
      useCartStore().cart = wholesale(true)
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(true)
    })
  })
})
