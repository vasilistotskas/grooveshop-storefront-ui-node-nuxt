import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import GiftCardInput from '~/components/Checkout/GiftCardInput.vue'
import WebsideGiftCardInput from '~/components/variants/webside/Checkout/GiftCardInput.vue'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'

/**
 * The gift-card field at checkout. A code is checked with Django (`POST
 * /api/giftcard/check`) and handed to the page with its balance; the
 * page owns the list of applied cards. Like coupons it is a commercial
 * feature behind the plan flag and a runtime setting, failing CLOSED.
 *
 * One `createApiMock` answers `$api` (the check) and `$fetch` (the
 * `useApi` settings payload). The webside copy differs only in its
 * Greek-only i18n block, whose strings the assertions below quote.
 */

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const flags = vi.hoisted(() => ({ giftCardsSetting: 'true' as string | null }))

const REDEEMABLE = {
  code: 'GC-AAAA-BBBB-CCCC',
  balance: '25.00',
  currency: 'EUR',
  expiresAt: null,
  isRedeemable: true,
}

function routes(check: unknown = REDEEMABLE) {
  api.routes({
    '/api/settings/public': () => {
      if (flags.giftCardsSetting === null) throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 })
      return { settings: { GIFT_CARDS_ENABLED: flags.giftCardsSetting } }
    },
    '/api/giftcard/check': check,
  })
}

const NOT_REDEEMABLE = 'Η δωροκάρτα δεν είναι διαθέσιμη (ανενεργή, ληγμένη ή χωρίς υπόλοιπο)'
const text = (wrapper: VueWrapper) => wrapper.text().replace(/ /g, ' ')

describe.each(trees(GiftCardInput, WebsideGiftCardInput))('$tree Checkout/GiftCardInput', ({ C }) => {
  beforeEach(() => {
    clearNuxtData()
    flags.giftCardsSetting = 'true'
    setTenant({ giftCardsEnabled: true })
    routes()
  })

  async function mount(appliedCards: Array<{ code: string, balance: number }> = []) {
    const wrapper = await mountSuspended(C, { route: false, props: { appliedCards } })
    // `useSettingFlag` reads an un-awaited `useApi`; the mock answers at once.
    await flushPromises()
    return wrapper
  }

  async function submitCode(wrapper: VueWrapper, code: string) {
    await wrapper.find('input').setValue(code)
    await wrapper.find('form').trigger('submit')
    await flushPromises()
  }

  const checks = () => api.callsTo('/api/giftcard/check')

  describe('adding a card', () => {
    it('checks the code upper-cased and hands the card to the page with its balance', async () => {
      const wrapper = await mount()

      await submitCode(wrapper, ' gc-aaaa-bbbb-cccc ')

      expect(checks()).toEqual([
        { url: '/api/giftcard/check', options: expect.objectContaining({ method: 'POST', body: { code: 'GC-AAAA-BBBB-CCCC' } }) },
      ])
      expect(wrapper.emitted('applied')).toEqual([[{ code: 'GC-AAAA-BBBB-CCCC', balance: 25 }]])
      expect((wrapper.find('input').element as HTMLInputElement).value).toBe('')
    })

    it.each([
      ['Django says it cannot be redeemed', { ...REDEEMABLE, isRedeemable: false }],
      ['its balance is spent', { ...REDEEMABLE, balance: '0.00' }],
    ])('refuses a card when %s', async (_case, check) => {
      routes(check)
      const wrapper = await mount()

      await submitCode(wrapper, 'GC-DEAD-DEAD-DEAD')

      expect(wrapper.emitted('applied')).toBeUndefined()
      expect(text(wrapper)).toContain(NOT_REDEEMABLE)
    })

    it.each([
      ['Django\'s detail', { detail: 'Η κάρτα έχει λήξει' }, 'Η κάρτα έχει λήξει'],
      ['"not valid" when the error says nothing', undefined, 'Ο κωδικός δωροκάρτας δεν είναι έγκυρος'],
    ])('shows %s when the check fails', async (_case, data, expected) => {
      routes(() => { throw Object.assign(new Error('Not Found'), { statusCode: 404, data }) })
      const wrapper = await mount()

      await submitCode(wrapper, 'GC-NOPE-NOPE-NOPE')

      expect(wrapper.emitted('applied')).toBeUndefined()
      expect(text(wrapper)).toContain(expected)
    })

    it('refuses a card that is already added without asking Django, whatever its case', async () => {
      const wrapper = await mount([{ code: 'GC-AAAA-BBBB-CCCC', balance: 25 }])

      await submitCode(wrapper, 'gc-aaaa-bbbb-cccc')

      expect(checks()).toEqual([])
      expect(wrapper.emitted('applied')).toBeUndefined()
      expect(text(wrapper)).toContain('Η δωροκάρτα έχει ήδη προστεθεί')
    })

    it('refuses a code shorter than six characters without asking Django', async () => {
      const wrapper = await mount()

      await submitCode(wrapper, 'GC-1')

      expect(checks()).toEqual([])
      await vi.waitFor(() => expect(text(wrapper)).toContain('Ο κωδικός είναι πολύ σύντομος'))
    })
  })

  describe('applied cards', () => {
    it('lists each applied card with its balance', async () => {
      const wrapper = await mount([
        { code: 'GC-0001-0001-0001', balance: 10 },
        { code: 'GC-0002-0002-0002', balance: 12.5 },
      ])

      expect(text(wrapper)).toContain('GC-0001-0001-0001')
      expect(text(wrapper)).toContain('Υπόλοιπο: 12,50 €')
    })

    it('asks the page to remove a card from its close button', async () => {
      const wrapper = await mount([
        { code: 'GC-0001-0001-0001', balance: 10 },
        { code: 'GC-0002-0002-0002', balance: 10 },
      ])

      await wrapper.findAll('[data-slot="close"]')[1]!.trigger('click')

      expect(wrapper.emitted('removed')).toEqual([['GC-0002-0002-0002']])
    })

    it('hides the field once three cards are applied', async () => {
      const wrapper = await mount([
        { code: 'GC-0001-0001-0001', balance: 10 },
        { code: 'GC-0002-0002-0002', balance: 10 },
        { code: 'GC-0003-0003-0003', balance: 10 },
      ])

      expect(wrapper.find('form').exists()).toBe(false)
    })
  })

  describe('the feature gates (fail closed)', () => {
    it('renders nothing on a plan without gift cards', async () => {
      setTenant({ giftCardsEnabled: false })
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('renders nothing when the merchant turned the setting off', async () => {
      flags.giftCardsSetting = 'false'
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('renders nothing when the settings lookup fails', async () => {
      flags.giftCardsSetting = null
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(false)
    })

    it('renders the field when both gates are open', async () => {
      const wrapper = await mount()

      expect(wrapper.find('form').exists()).toBe(true)
    })
  })
})
