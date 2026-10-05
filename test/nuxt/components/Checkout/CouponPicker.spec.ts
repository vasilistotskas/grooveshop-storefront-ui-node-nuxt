import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import CouponPicker from '~/components/Checkout/CouponPicker.vue'
import WebsideCouponPicker from '~/components/variants/webside/Checkout/CouponPicker.vue'
import type { CartCoupon, PublicPromotion } from '~~/shared/openapi/types.gen'
import { makeCart } from '~~/test/fixtures/cart'
import { trees } from '~~/test/helpers/trees'
import { failWith } from '~~/test/helpers/api'

/**
 * "Διαθέσιμα κουπόνια (x)": the coupons this cart can use, each with the
 * verdict Django's `CouponService.apply` would give right now — so a
 * disabled row here and a refusal on apply can never disagree. These
 * tests pin that contract: an ineligible row is DISABLED and says why,
 * the trigger never advertises a count the shopper cannot act on, and
 * applying one goes through Django and re-reads both the cart and the
 * verdicts.
 *
 * `$api` and `$fetch` share one `createApiMock`: the list is a
 * `useApi` (transported by `$fetch`), the apply is `$api`. The two
 * webside and default copies are byte-identical.
 */

const device = vi.hoisted(() => ({ mobile: false }))
mockNuxtImport('useDevice', () => () => ({ isMobileOrTablet: device.mobile }))

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

function offer(overrides: Partial<PublicPromotion> = {}): PublicPromotion {
  return {
    id: 1,
    name: 'Καλωσόρισμα -10%',
    description: '',
    trigger: 'CODE',
    benefitType: 'PERCENTAGE',
    benefitValue: 10,
    targetScope: 'ORDER',
    code: null,
    minSubtotal: null,
    maxDiscountAmount: null,
    minQuantity: null,
    buyQuantity: null,
    getQuantity: null,
    getDiscountPercent: 100,
    excludeDiscountedProducts: false,
    firstOrderOnly: false,
    stackable: true,
    endsAt: null,
    rewardProducts: [],
    eligibleProducts: [],
    eligibleProductCount: 0,
    eligibleCategories: [],
    ...overrides,
  }
}

function coupon(overrides: Partial<Omit<CartCoupon, 'promotion'>> & { promotion?: Partial<PublicPromotion> } = {}): CartCoupon {
  const { promotion, ...rest } = overrides
  return {
    promotion: offer(promotion),
    code: 'SAVE5',
    eligible: true,
    reason: null,
    discountAmount: 5,
    freeShipping: false,
    applied: false,
    personal: false,
    ...rest,
  }
}

let coupons: CartCoupon[] = []

const t = (key: string, params: Record<string, unknown> = {}): string => useNuxtApp().$i18n.t(key, params)
const bodyText = () => (document.body.textContent ?? '').replace(/\u00A0/g, ' ')
/** The modal teleports to `document.body`, outside the wrapper. */
const modalButtons = (label: string) =>
  [...document.querySelectorAll('button')].filter(node => node.textContent?.trim() === label)

describe.each(trees(CouponPicker, WebsideCouponPicker))('$tree Checkout/CouponPicker', ({ tree, C }) => {
  beforeEach(() => {
    coupons = []
    device.mobile = false
    // `useApi` caches by key on the one app the whole file shares.
    clearNuxtData('cart-coupons')
    useToast().clear()
    useCartStore().cart = makeCart()
    api.routes({
      '/api/cart/coupons': () => coupons,
      '/api/cart': () => makeCart(),
    })
  })

  async function mount() {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    return wrapper
  }

  async function open(wrapper: VueWrapper) {
    await wrapper.find('button').trigger('click')
    await flushPromises()
  }

  const couponListCalls = () => api.callsTo('/api/cart/coupons').length

  describe('the trigger', () => {
    it('renders nothing when the store publishes no coupons', async () => {
      const wrapper = await mount()

      expect(wrapper.find('button').exists()).toBe(false)
    })

    it('counts only the coupons the shopper can actually claim', async () => {
      coupons = [
        coupon({ code: 'SAVE5' }),
        coupon({ code: 'LOCKED', eligible: false, reason: 'discount_code_minimum_not_met', discountAmount: 0 }),
        coupon({ code: 'ONCART', applied: true }),
      ]
      const wrapper = await mount()

      expect(wrapper.find('button').text()).toBe(tree === 'webside'
        ? 'Διαθέσιμα κουπόνια (1)'
        : 'Δες 1 κουπόνι που μπορείς να χρησιμοποιήσεις')
    })

    it.runIf(tree === 'default')('pluralises the trigger for several claimable coupons', async () => {
      coupons = [coupon({ code: 'SAVE5' }), coupon({ code: 'GAN20' })]
      const wrapper = await mount()

      expect(wrapper.find('button').text()).toBe('Δες 2 κουπόνια που μπορείς να χρησιμοποιήσεις')
    })

    it('drops the number rather than advertising zero claimable coupons', async () => {
      coupons = [coupon({ code: 'LOCKED', eligible: false, reason: 'discount_code_expired', discountAmount: 0 })]
      const wrapper = await mount()

      expect(wrapper.find('button').text()).toBe('Δες τα κουπόνια του καταστήματος')
    })
  })

  describe('the list', () => {
    it('disables an ineligible coupon and explains the refusal', async () => {
      coupons = [coupon({ code: 'LOCKED', eligible: false, reason: 'discount_code_minimum_not_met', discountAmount: 0 })]
      const wrapper = await mount()

      await open(wrapper)

      expect(bodyText()).toContain(t('promotion.rejection.discount_code_minimum_not_met'))
      expect(modalButtons('Εφαρμογή')).toHaveLength(1)
      expect(modalButtons('Εφαρμογή')[0]!.hasAttribute('disabled')).toBe(true)
    })

    it('marks the coupon already on the cart instead of offering it again', async () => {
      coupons = [coupon({ code: 'ONCART', applied: true })]
      const wrapper = await mount()

      await open(wrapper)

      expect(modalButtons('Εφαρμογή')).toHaveLength(0)
      expect(bodyText()).toContain('Εφαρμοσμένο')
    })

    it.each([
      ['the amount it takes off', coupon({ discountAmount: 5 }), '-5,00 €'],
      ['free shipping when that is what it gives', coupon({ discountAmount: 0, freeShipping: true }), 'Δωρεάν αποστολή'],
      ['that it takes nothing off right now', coupon({ discountAmount: 0 }), 'Δεν μειώνει το σύνολο αυτή τη στιγμή'],
    ])('tells the shopper %s', async (_case, row, expected) => {
      coupons = [row]
      const wrapper = await mount()

      await open(wrapper)

      expect(bodyText()).toContain(expected)
    })
  })

  describe('applying a coupon', () => {
    it('applies it through Django, re-reads the cart and the verdicts, and reports it', async () => {
      coupons = [coupon({ code: 'SAVE5', promotion: { name: '-5€ σε αγορές από 49€' } })]
      const wrapper = await mount()
      await open(wrapper)
      const listedBefore = couponListCalls()

      modalButtons('Εφαρμογή')[0]!.click()
      await flushPromises()

      // `/api/cart/coupons` (the list) CONTAINS `/api/cart/coupon`;
      // `callsTo` matches the exact path.
      expect(api.callsTo('/api/cart/coupon')).toEqual([
        { url: '/api/cart/coupon', options: expect.objectContaining({ method: 'POST', body: { code: 'SAVE5' } }) },
      ])
      expect(api.callsTo('/api/cart')).toEqual([
        { url: '/api/cart', options: expect.objectContaining({ method: 'GET' }) },
      ])
      expect(couponListCalls()).toBeGreaterThan(listedBefore)
      expect(wrapper.emitted('applied')).toEqual([['SAVE5']])
      expect(useToast().toasts.value).toEqual([
        expect.objectContaining({ color: 'success', title: 'Το κουπόνι εφαρμόστηκε', description: '-5€ σε αγορές από 49€' }),
      ])
      expect(modalButtons('Εφαρμογή')).toHaveLength(0)
    })

    it('re-reads the verdicts itself even when re-reading the cart fails', async () => {
      // With the cart unchanged nothing else would re-judge the list, and
      // the applied coupon would still be offered as claimable.
      coupons = [coupon({ code: 'SAVE5' })]
      api.routes({
        '/api/cart/coupons': () => coupons,
        '/api/cart': failWith(502),
      })
      const wrapper = await mount()
      await open(wrapper)
      const listedBefore = couponListCalls()

      modalButtons('Εφαρμογή')[0]!.click()
      await flushPromises()

      expect(couponListCalls()).toBe(listedBefore + 1)
      expect(wrapper.emitted('applied')).toEqual([['SAVE5']])
    })

    it('reports a refusal from Django and re-reads the verdicts instead of applying', async () => {
      // Reaching here means the cart moved between the verdict and the click.
      coupons = [coupon({ code: 'SAVE5' })]
      api.routes({
        '/api/cart/coupons': () => coupons,
        '/api/cart/coupon': () => {
          throw Object.assign(new Error('Bad Request'), { statusCode: 400, data: { reason: 'discount_code_minimum_not_met' } })
        },
      })
      const wrapper = await mount()
      await open(wrapper)
      const listedBefore = couponListCalls()

      modalButtons('Εφαρμογή')[0]!.click()
      await flushPromises()

      expect(wrapper.emitted('applied')).toBeUndefined()
      expect(useToast().toasts.value).toEqual([
        expect.objectContaining({
          color: 'error',
          title: 'Το κουπόνι δεν εφαρμόστηκε',
          description: t('promotion.rejection.discount_code_minimum_not_met'),
        }),
      ])
      expect(couponListCalls()).toBeGreaterThan(listedBefore)
      expect(api.callsTo('/api/cart')).toEqual([])
    })
  })

  it.runIf(tree === 'default')('shows the code and what the coupon does in the list', async () => {
    coupons = [coupon({ code: 'GAN20', promotion: { name: '-20% στους φορτιστές GaN', description: 'Μόνο για φορτιστές' } })]
    const wrapper = await mount()

    await open(wrapper)

    expect(document.body.querySelector('code')!.textContent).toBe('GAN20')
    expect(bodyText()).toContain('-20% στους φορτιστές GaN')
    expect(bodyText()).toContain('Μόνο για φορτιστές')
  })

  it.runIf(tree === 'default')('marks a coupon assigned to the shopper as personal, and no other', async () => {
    coupons = [
      coupon({ code: 'BDAY15', personal: true, promotion: { name: '15% δώρο γενεθλίων' } }),
      coupon({ code: 'GAN20', promotion: { name: '-20% στους φορτιστές GaN' } }),
    ]
    const wrapper = await mount()

    await open(wrapper)

    const rows = [...document.body.querySelectorAll('li')]
    const personal = rows.find(row => row.querySelector('code')?.textContent === 'BDAY15')!
    const other = rows.find(row => row.querySelector('code')?.textContent === 'GAN20')!
    expect(personal.textContent).toContain('Προσωπικό')
    expect(personal.textContent).toContain('Δικό σου')
    expect(other.textContent).not.toContain('Προσωπικό')
    expect(other.textContent).not.toContain('Δικό σου')
  })

  it.runIf(tree === 'default')('opens the list as a bottom sheet on a phone, and applies from it', async () => {
    device.mobile = true
    coupons = [coupon({ code: 'SAVE5' })]
    const wrapper = await mount()

    await open(wrapper)

    expect(document.body.querySelector('[data-vaul-drawer]')).not.toBeNull()
    modalButtons('Εφαρμογή')[0]!.click()
    await flushPromises()
    expect(wrapper.emitted('applied')).toEqual([['SAVE5']])
  })

  it('re-judges the coupons when the basket\'s value changes', async () => {
    // A coupon blocked on a minimum subtotal becomes usable the moment
    // the shopper adds one more item.
    coupons = [coupon()]
    await mount()
    const listedBefore = couponListCalls()

    useCartStore().cart = makeCart({ items: [{ quantity: 3 }] })
    await flushPromises()

    expect(couponListCalls()).toBe(listedBefore + 1)
  })
})
