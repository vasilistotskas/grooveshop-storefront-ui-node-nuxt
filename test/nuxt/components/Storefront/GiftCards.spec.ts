import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import GiftCards from '~/components/Storefront/GiftCards.vue'
import { makePayWay } from '~~/test/fixtures/payWay'
import { setTenant } from '~~/test/helpers/tenant'
import { failWith } from '~~/test/helpers/api'

/**
 * The gift-card purchase wizard: Amount → Recipient → Payment. Each
 * step asks only for its own fields before Continue lets the buyer on;
 * the purchase goes to `POST /api/giftcard/purchase` with the chosen
 * delivery date (`deliverAt`), and a card payment (Stripe) finishes in
 * place. One `createApiMock` answers `$api` (the purchase, the pay-way
 * list) and `$fetch` (the settings behind the amount bounds).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// Stripe's script is a network load; the card element is not under test.
mockNuxtImport('useScriptStripe', () => () => ({ onLoaded: () => {} }))

const settings = vi.hoisted(() => ({ values: {} as Record<string, string> }))

const VIVA = makePayWay({ id: 1, providerCode: 'viva_wallet', settlement: 'online' })
const STRIPE = makePayWay({ id: 2, providerCode: 'stripe', settlement: 'online' })

function routes(extra: Record<string, unknown> = {}) {
  api.routes({
    '/api/settings/public': () => ({ settings: settings.values }),
    '/api/pay-way': { count: 1, results: [VIVA] },
    '/api/giftcard/purchase': {
      purchaseUuid: 'a1b2c3d4-0000-4000-8000-000000000001',
      provider: 'viva_wallet',
      clientSecret: 'secret_123',
      amount: 50,
      currency: 'EUR',
    },
    ...extra,
  })
}

const text = (wrapper: VueWrapper) => wrapper.text().replace(/\u00A0/g, ' ')

beforeEach(() => {
  clearNuxtData()
  settings.values = {}
  setTenant({ stripePublishableKey: 'pk_test_123' })
  routes()
})

async function mount() {
  const wrapper = await mountSuspended(GiftCards, { route: false })
  await flushPromises()
  return wrapper
}

const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(candidate => candidate.text().replace(/\u00A0/g, ' ') === label)

/** The radio of the card labelled `label` (amount cards, send mode, provider). */
function radio(wrapper: VueWrapper, label: string) {
  const card = wrapper.findAll('[data-slot="item"]').find(item => item.text().replace(/\u00A0/g, ' ').includes(label))
  if (!card) throw new Error(`no card labelled ${label}`)
  return card.find('[role="radio"]')
}

async function press(wrapper: VueWrapper, label: string) {
  await button(wrapper, label)!.trigger('click')
  await flushPromises()
}

async function toRecipient(wrapper: VueWrapper) {
  await press(wrapper, 'Συνέχεια')
}

async function fillRecipient(wrapper: VueWrapper, fields: { recipientEmail?: string, buyerEmail?: string } = {}) {
  const inputs = wrapper.findAll('input[type="email"]')
  await inputs[0]!.setValue(fields.recipientEmail ?? 'eleni@example.com')
  await inputs[1]!.setValue(fields.buyerEmail ?? 'buyer@example.com')
}

const purchases = () => api.callsTo('/api/giftcard/purchase')
const lastBody = () => purchases().at(-1)!.options.body as Record<string, unknown>

describe('Storefront/GiftCards', () => {
  describe('step 1: the amount', () => {
    it('offers the suggested amounts and a typed one, 50 € chosen', async () => {
      const wrapper = await mount()

      expect(['25,00 €', '50,00 €', '100,00 €', 'Άλλο'].map(label => radio(wrapper, label).exists())).toEqual([true, true, true, true])
      expect(radio(wrapper, '50,00 €').attributes('aria-checked')).toBe('true')
    })

    it('draws the chosen amount on the card preview', async () => {
      const wrapper = await mount()

      await radio(wrapper, '100,00 €').trigger('click')

      expect(wrapper.find('figure').text().replace(/\u00A0/g, ' ')).toContain('100,00 €')
    })

    it('leaves out a suggested amount the store does not allow', async () => {
      settings.values = { GIFT_CARD_MIN_AMOUNT: '30' }
      const wrapper = await mount()

      expect(wrapper.findAll('[data-slot="item"]').some(item => item.text().includes('25,00'))).toBe(false)
    })

    it('stays on the step when the amount is over the store\'s maximum', async () => {
      // 50 € is no longer a suggestion, so it opens as a typed amount.
      settings.values = { GIFT_CARD_MAX_AMOUNT: '40' }
      const wrapper = await mount()

      await toRecipient(wrapper)

      expect(text(wrapper)).toContain('Μέγιστο ποσό 40 €')
      expect(wrapper.findAll('input[type="email"]')).toHaveLength(0)
    })

    it('moves on to the recipient with Continue', async () => {
      const wrapper = await mount()

      await toRecipient(wrapper)

      expect(wrapper.findAll('input[type="email"]')).toHaveLength(2)
    })
  })

  describe('step 2: the recipient', () => {
    it('asks for a valid recipient email before going on', async () => {
      const wrapper = await mount()
      await toRecipient(wrapper)

      await press(wrapper, 'Συνέχεια στην πληρωμή · 50,00 €')

      expect(text(wrapper)).toContain('Μη έγκυρο email')
      expect(button(wrapper, 'Πληρωμή 50,00 €')).toBeUndefined()
    })

    it('still asks for the recipient\'s email when only the buyer\'s is given', async () => {
      const wrapper = await mount()
      await toRecipient(wrapper)
      await wrapper.findAll('input[type="email"]')[1]!.setValue('buyer@example.com')

      await press(wrapper, 'Συνέχεια στην πληρωμή · 50,00 €')

      expect(button(wrapper, 'Πληρωμή 50,00 €')).toBeUndefined()
    })

    it('goes on to payment once the emails are valid', async () => {
      const wrapper = await mount()
      await toRecipient(wrapper)
      await fillRecipient(wrapper)

      await press(wrapper, 'Συνέχεια στην πληρωμή · 50,00 €')

      expect(button(wrapper, 'Πληρωμή 50,00 €')).toBeDefined()
    })

    it('draws the names and the message on the card as they are typed', async () => {
      const wrapper = await mount()
      await toRecipient(wrapper)

      const [recipientName, senderName] = wrapper.findAll('input[type="text"]')
      await recipientName!.setValue('Ελένη')
      await senderName!.setValue('Δήμος')
      await wrapper.find('textarea').setValue('Χρόνια πολλά!')

      const card = wrapper.find('figure').text()
      expect(card).toContain('Για Ελένη, από Δήμος')
      expect(card).toContain('“Χρόνια πολλά!”')
    })

    it('shows a date field only for "on a date", and refuses a date in the past', async () => {
      const wrapper = await mount()
      await toRecipient(wrapper)
      await fillRecipient(wrapper)
      expect(wrapper.find('input[type="date"]').exists()).toBe(false)

      await radio(wrapper, 'Σε συγκεκριμένη ημερομηνία').trigger('click')
      await wrapper.find('input[type="date"]').setValue('2000-01-01')
      await press(wrapper, 'Συνέχεια στην πληρωμή · 50,00 €')

      expect(text(wrapper)).toContain('Διάλεξε ημερομηνία από αύριο και μετά')
      expect(button(wrapper, 'Πληρωμή 50,00 €')).toBeUndefined()
    })
  })

  describe('step 3: the payment', () => {
    async function toPayment(wrapper: VueWrapper) {
      await toRecipient(wrapper)
      await fillRecipient(wrapper)
      await press(wrapper, 'Συνέχεια στην πληρωμή · 50,00 €')
    }

    it('buys the card now: no delivery date is sent', async () => {
      const wrapper = await mount()
      await toPayment(wrapper)

      await press(wrapper, 'Πληρωμή 50,00 €')

      expect(purchases()).toHaveLength(1)
      expect(lastBody()).toMatchObject({
        amount: 50,
        recipientEmail: 'eleni@example.com',
        buyerEmail: 'buyer@example.com',
        paymentProvider: 'viva_wallet',
      })
      expect(lastBody().deliverAt).toBeUndefined()
    })

    it('schedules the delivery for midnight of the chosen day', async () => {
      const wrapper = await mount()
      await toRecipient(wrapper)
      await fillRecipient(wrapper)
      await radio(wrapper, 'Σε συγκεκριμένη ημερομηνία').trigger('click')
      await wrapper.find('input[type="date"]').setValue('2099-01-15')
      await press(wrapper, 'Συνέχεια στην πληρωμή · 50,00 €')

      await press(wrapper, 'Πληρωμή 50,00 €')

      const sent = new Date(lastBody().deliverAt as string)
      expect([sent.getFullYear(), sent.getMonth(), sent.getDate(), sent.getHours()]).toEqual([2099, 0, 15, 0])
    })

    it('sends the provider the buyer picks when the store offers two', async () => {
      routes({ '/api/pay-way': { count: 2, results: [VIVA, STRIPE] } })
      const wrapper = await mount()
      await toPayment(wrapper)

      await radio(wrapper, 'Κάρτα (Stripe)').trigger('click')
      await press(wrapper, 'Πληρωμή 50,00 €')

      expect(lastBody()).toMatchObject({ paymentProvider: 'stripe' })
    })

    it('tells the buyer why the purchase did not start', async () => {
      routes({ '/api/giftcard/purchase': failWith(400, { detail: 'Το ποσό δεν είναι έγκυρο' }) })
      const wrapper = await mount()
      await toPayment(wrapper)

      await press(wrapper, 'Πληρωμή 50,00 €')

      expect(text(wrapper)).toContain('Το ποσό δεν είναι έγκυρο')
    })

    it('asks for the card in place when the provider answers with a client secret', async () => {
      const wrapper = await mount()
      await toPayment(wrapper)

      await press(wrapper, 'Πληρωμή 50,00 €')

      expect(text(wrapper)).toContain('Πληρωμή 50,00 €')
      // The card is not complete yet, so paying is not offered.
      expect(button(wrapper, 'Πληρωμή 50,00 €')!.attributes('disabled')).toBeDefined()
    })
  })
})
