import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import * as z from 'zod'
import StepShipping from '~/components/Checkout/StepShipping.vue'
import WebsideStepShipping from '~/components/variants/webside/Checkout/StepShipping.vue'
import type { QuoteShippingOption, ShippingOption } from '~~/shared/openapi/types.gen'
import { makeBoxNowPickedLocker } from '~~/test/fixtures/boxnow'
import { makeCart } from '~~/test/fixtures/cart'
import {
  acsHomeDeliveryOption,
  acsSmartpointOption,
  boxNowLockerOption,
  makeShippingOption,
} from '~~/test/fixtures/shippingOptions'
import { setTenant } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'
import { makeQuoteShippingOption } from '~~/test/fixtures/checkoutQuote'

/**
 * The shipping step of checkout: one radio card per delivery method the
 * store serves, in Django's priority order, plus the locker picker of the
 * chosen carrier. The page's sidebar CTA calls the step's exposed
 * `submit()` — the real contract, so the tests drive it the same way.
 *
 * The webside copy differs only in the prefixed child tags
 * (`WebsideCheckoutSelected*Locker`) and its Greek-only i18n block, so
 * both trees run one body.
 */

/** A Greek store: BoxNow (priority 5) first, then ACS home delivery. */
const GREEK_ROWS = (): ShippingOption[] => [boxNowLockerOption(), acsHomeDeliveryOption()]

function makeFormState(overrides: Record<string, unknown> = {}) {
  return reactive<Record<string, any>>({
    shippingMethod: 'home_delivery',
    country: 'GR',
    boxnowLockerId: '',
    boxnowLocker: null,
    ...overrides,
  })
}

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: makeFormState(),
    schema: null,
    apiOptions: GREEK_ROWS(),
    quotedOptions: null,
    regionOptions: [],
    acsEnabled: false,
    b2bInvoicingEnabled: false,
    ...overrides,
  }
}

/** The radio of one delivery method, as the shopper reaches it. */
function radio(wrapper: VueWrapper, value: string): DOMWrapper<Element> {
  return wrapper.find(`[role="radio"][value="${value}"]`)
}

/** The card (label) holding a method's radio, its description and its reasons. */
function card(wrapper: VueWrapper, value: string): DOMWrapper<Element> {
  const found = wrapper.findAll('[data-slot="item"]')
    .find(item => item.find(`[role="radio"][value="${value}"]`).exists())
  if (!found) throw new Error(`no card for ${value}`)
  return found
}

function radioValues(wrapper: VueWrapper): string[] {
  return wrapper.findAll('[role="radio"]').map(el => el.attributes('value')!)
}

/** The step's exposed `submit()`, which the sidebar CTA calls. */
async function submitStep(wrapper: VueWrapper): Promise<void> {
  await (wrapper.vm as unknown as { $: { exposed: { submit: () => Promise<void> } } }).$.exposed.submit()
}

const t = (key: string, params: Record<string, unknown> = {}): string => useNuxtApp().$i18n.t(key, params)

/**
 * The default tree's delivery estimate, in business days after dispatch
 * (the webside card has no such line). One row stands for every
 * home-delivery carrier, so it quotes the one the cart is priced by.
 */
describe('Checkout/StepShipping delivery estimates', () => {
  const mount = (apiOptions: ShippingOption[]) =>
    mountSuspended(StepShipping, { route: false, props: makeProps({ apiOptions }) })

  it('quotes a range in business days', async () => {
    const wrapper = await mount([acsHomeDeliveryOption({ deliveryDaysMin: 2, deliveryDaysMax: 4 })])

    expect(card(wrapper, 'home_delivery').text()).toContain('2–4 εργάσιμες ημέρες')
  })

  it('says one business day, in the singular, when both ends agree', async () => {
    const wrapper = await mount([boxNowLockerOption({ deliveryDaysMin: 1, deliveryDaysMax: 1 })])

    expect(card(wrapper, 'box_now_locker').text()).toContain('1 εργάσιμη ημέρα')
    expect(card(wrapper, 'box_now_locker').text()).not.toContain('εργάσιμες')
  })

  it.each([
    [0, 0, 'Την ίδια εργάσιμη'],
    [0, 2, 'Έως 2 εργάσιμες ημέρες'],
    [0, 1, 'Έως 1 εργάσιμη ημέρα'],
  ])('reads a %i–%i estimate as "%s", never "0 days"', async (min, max, copy) => {
    const wrapper = await mount([acsHomeDeliveryOption({ deliveryDaysMin: min, deliveryDaysMax: max })])

    expect(card(wrapper, 'home_delivery').text()).toContain(copy)
  })

  it('says nothing when the rate advertises no estimate', async () => {
    const wrapper = await mount([makeShippingOption()])

    expect(card(wrapper, 'home_delivery').text()).not.toContain('εργάσιμ')
  })

  it('quotes the carrier the cart is priced by when one card stands for several', async () => {
    const wrapper = await mount([
      makeShippingOption({ providerCode: 'heavy', exceedsMaxWeight: true, deliveryDaysMin: 5, deliveryDaysMax: 7 }),
      makeShippingOption({ providerCode: 'acs', deliveryDaysMin: 2, deliveryDaysMax: 3 }),
    ])

    expect(card(wrapper, 'home_delivery').text()).toContain('2–3 εργάσιμες ημέρες')
  })
})

describe.each(trees(StepShipping, WebsideStepShipping))('$tree Checkout/StepShipping', ({ tree, C, own }) => {
  // The tenant store outlives a test: every test starts from the defaults.
  beforeEach(() => {
    setTenant()
  })

  const mount = (overrides: Record<string, unknown> = {}) =>
    mountSuspended(C, { route: false, props: makeProps(overrides) })

  describe('the method cards', () => {
    it('renders one card per method the store serves, in the priority order Django sent', async () => {
      const wrapper = await mount()

      expect(radioValues(wrapper)).toEqual(['box_now_locker', 'home_delivery'])
    })

    it('omits the BoxNow card when the store does not serve BoxNow', async () => {
      const wrapper = await mount({ apiOptions: [acsHomeDeliveryOption()] })

      expect(radioValues(wrapper)).toEqual(['home_delivery'])
    })

    it('shows the chosen method as checked', async () => {
      const wrapper = await mount({ formState: makeFormState({ shippingMethod: 'box_now_locker' }) })

      expect(radio(wrapper, 'box_now_locker').attributes('aria-checked')).toBe('true')
      expect(radio(wrapper, 'home_delivery').attributes('aria-checked')).toBe('false')
    })

    // The original under the static host only redirects to media-stream at
    // full size; the path renders the logo at the card's own size.
    it('draws an uploaded carrier logo through media-stream at the card\'s size', async () => {
      setTenant({ assetsDomain: 'assets.shop.test' })
      const wrapper = await mount({
        apiOptions: [acsHomeDeliveryOption({ logoPath: 'media/acme/uploads/shipping/acs.png' })],
      })

      const src = card(wrapper, 'home_delivery').find('img').attributes('src')
      expect(src).toContain('https://assets.shop.test/media_stream-image/media/acme/uploads/shipping/acs.png/96/66/contain/')
      expect(src).not.toContain('static')
    })

    it('falls back to the bundled logo when none is uploaded', async () => {
      const wrapper = await mount({ apiOptions: [acsHomeDeliveryOption({ logoPath: null })] })

      expect(card(wrapper, 'home_delivery').find('img').attributes('src')).toContain('/img/shipping/default.svg')
    })
  })

  describe('the locker picker of the chosen carrier', () => {
    it('mounts no locker picker for home delivery', async () => {
      const wrapper = await mount()

      expect(wrapper.findComponent({ name: own('CheckoutSelectedGenericLocker') }).exists()).toBe(false)
    })

    // #204: BOX NOW's lockers are Django's catalogue, picked in the same
    // picker as ACS's; its own map widget is gone.
    it('hands a BOX NOW choice to the generic picker, on the delivery country\'s lockers', async () => {
      const formState = makeFormState({ country: 'CY' })
      const wrapper = await mount({ formState, apiOptions: [boxNowLockerOption({ countryCode: 'CY' })] })

      await radio(wrapper, 'box_now_locker').trigger('click')

      expect(formState.shippingMethod).toBe('box_now_locker')
      const picker = wrapper.findComponent({ name: own('CheckoutSelectedGenericLocker') })
      expect(picker.props('carrier').code).toBe('boxnow')
      expect(picker.props('countryCode')).toBe('CY')
    })

    // #204: BOX NOW's lockers are listed for the compartment size the
    // quote says the cart packs into; until it has said, none.
    it('hands the BOX NOW picker the compartment size the quote names for its pickup', async () => {
      const boxNow = boxNowLockerOption()
      const quotedRow = (compartmentSize: number | null): QuoteShippingOption => makeQuoteShippingOption({
        providerCode: boxNow.providerCode,
        providerName: boxNow.providerName,
        kind: boxNow.kind,
        price: 3.5,
        compartmentSize,
      })
      const wrapper = await mount({
        formState: makeFormState({ shippingMethod: 'box_now_locker' }),
        apiOptions: [boxNow],
        quotedOptions: [quotedRow(2)],
      })
      const picker = () => wrapper.findComponent({ name: own('CheckoutSelectedGenericLocker') })

      const size = () => ({ size: picker().props('compartmentSize'), waits: picker().props('awaitingSize') })
      expect(size()).toEqual({ size: 2, waits: false })

      // No answer yet: the picker waits for one.
      await wrapper.setProps({ quotedOptions: null })
      expect(size()).toEqual({ size: null, waits: true })

      // A new quote on its way: the last one may name the old cart's size.
      await wrapper.setProps({ quotedOptions: [quotedRow(2)], quotePending: true })
      expect(size()).toEqual({ size: null, waits: true })
      await wrapper.setProps({ quotedOptions: [quotedRow(3)], quotePending: false })
      expect(size()).toEqual({ size: 3, waits: false })

      // A store on BOX NOW's stage network: the row names no size, and
      // the picker lists every locker instead of waiting.
      await wrapper.setProps({ quotedOptions: [quotedRow(null)] })
      expect(size()).toEqual({ size: null, waits: false })
    })

    it('hands an ACS Smartpoint choice to the generic picker, with the address typed so far', async () => {
      const wrapper = await mountSuspended(C, {
        route: false,
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'acs_smartpoint', zipcode: '15234', city: 'Χαλάνδρι' }),
          apiOptions: [acsHomeDeliveryOption(), acsSmartpointOption()],
        }),
        global: { stubs: { [own('CheckoutSelectedGenericLocker')]: true } },
      })

      const picker = wrapper.findComponent({ name: own('CheckoutSelectedGenericLocker') })
      expect(picker.props()).toMatchObject({
        initialPostalCode: '15234',
        countryCode: 'GR',
      })
      expect(picker.props('carrier').code).toBe('acs')
    })
  })

  describe('switching method clears the other carrier\'s locker', () => {
    /**
     * An orphan locker id left on the form would travel into the order
     * payload and route a home delivery to a locker.
     */
    const withBothLockers = (shippingMethod: string) => makeFormState({
      shippingMethod,
      boxnowLockerId: '4',
      boxnowLocker: makeBoxNowPickedLocker(),
      acsStationExternalId: 'ACS-1',
      acsStationBranch: '12',
      acsStation: { id: 'ACS-1' },
    })

    it('drops both carriers\' lockers when the shopper switches to home delivery', async () => {
      const formState = withBothLockers('box_now_locker')
      const wrapper = await mount({ formState })

      await radio(wrapper, 'home_delivery').trigger('click')

      expect(formState).toMatchObject({
        shippingMethod: 'home_delivery',
        boxnowLockerId: '',
        boxnowLocker: null,
        acsStationExternalId: '',
        acsStationBranch: '',
        acsStation: null,
      })
    })

    it('keeps the BoxNow locker and drops only the ACS one when switching to BoxNow', async () => {
      const formState = withBothLockers('home_delivery')
      const wrapper = await mount({ formState })

      await radio(wrapper, 'box_now_locker').trigger('click')

      expect(formState.boxnowLockerId).toBe('4')
      expect(formState.acsStationExternalId).toBe('')
      expect(formState.acsStation).toBeNull()
    })
  })

  describe('submit() — the sidebar CTA', () => {
    it('advances with home delivery', async () => {
      const wrapper = await mount()

      await submitStep(wrapper)

      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it.each([
      ['GR', GREEK_ROWS()],
      ['CY', [boxNowLockerOption({ countryCode: 'CY' })]],
    ])('advances with a BoxNow locker picked (%s)', async (country, apiOptions) => {
      const wrapper = await mount({
        formState: makeFormState({
          shippingMethod: 'box_now_locker',
          country,
          boxnowLockerId: '4',
          boxnowLocker: makeBoxNowPickedLocker({ countryCode: country }),
        }),
        apiOptions,
      })

      await submitStep(wrapper)

      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it('opens the picker instead of advancing when no locker is picked yet', async () => {
      // A disabled Continue with no hint lost a real customer (order 53,
      // 2026-05-12) to a competitor; the picker now opens on the click.
      const wrapper = await mount({ formState: makeFormState({ shippingMethod: 'box_now_locker' }) })
      const picker = wrapper.findComponent({ name: own('CheckoutSelectedGenericLocker') })
      expect(picker.props('open')).toBe(false)

      await submitStep(wrapper)
      await nextTick()

      expect(wrapper.emitted('next')).toBeUndefined()
      expect(picker.props('open')).toBe(true)
    })

    it('does not advance on a method the store no longer serves', async () => {
      const wrapper = await mount({
        formState: makeFormState({ shippingMethod: 'box_now_locker', boxnowLockerId: '4' }),
        apiOptions: [acsHomeDeliveryOption()],
      })

      await submitStep(wrapper)

      expect(wrapper.emitted('next')).toBeUndefined()
    })
  })

  // #767: a pickup order is delivered to the point, so the address is
  // a home delivery's alone, asked here rather than on the details step.
  describe('the address', () => {
    it('asks a home delivery for its address', async () => {
      const wrapper = await mount()

      for (const name of ['street', 'streetNumber', 'zipcode', 'city']) {
        expect(wrapper.find(`input[name="${name}"]`).exists(), name).toBe(true)
      }
    })

    it.each(['box_now_locker', 'acs_smartpoint'])('asks a %s order for no address', async (shippingMethod) => {
      const wrapper = await mount({
        formState: makeFormState({ shippingMethod }),
        apiOptions: [...GREEK_ROWS(), acsSmartpointOption()],
      })

      for (const name of ['street', 'streetNumber', 'zipcode', 'city']) {
        expect(wrapper.find(`input[name="${name}"]`).exists(), name).toBe(false)
      }
    })

    // The step's form holds the address: «Continue» checks it.
    it('does not advance a home delivery its schema refuses', async () => {
      const wrapper = await mount({
        schema: z.object({ street: z.string().min(1, { error: 'Required street' }) }),
        formState: makeFormState({ street: '' }),
      })

      await submitStep(wrapper)
      await nextTick()

      expect(wrapper.emitted('next')).toBeUndefined()
      expect(wrapper.text()).toContain('Required street')
    })

    it('shows Django\'s field errors under their inputs', async () => {
      const wrapper = await mount({ serverErrors: [{ name: 'zipcode', message: 'Enter a valid postcode.' }] })
      await nextTick()

      expect(wrapper.text()).toContain('Enter a valid postcode.')
    })
  })

  describe('the invoice', () => {
    const invoiceForm = (shippingMethod: string) => makeFormState({
      shippingMethod,
      documentType: 'INVOICE',
      billingSameAsShipping: true,
      boxnowLockerId: '4',
      boxnowLocker: makeBoxNowPickedLocker(),
    })

    it('offers "same as delivery" to a home delivery', async () => {
      const wrapper = await mount({ b2bInvoicingEnabled: true, formState: invoiceForm('home_delivery') })

      expect(wrapper.text()).toContain(t('form.invoice.billing_same_label'))
      expect(wrapper.find('input[name="billingStreet"]').exists()).toBe(false)
    })

    // A pickup point is no company's address: Django refuses one.
    it('asks a pickup invoice for the company\'s address', async () => {
      const wrapper = await mount({ b2bInvoicingEnabled: true, formState: invoiceForm('box_now_locker') })

      expect(wrapper.text()).not.toContain(t('form.invoice.billing_same_label'))
      expect(wrapper.find('input[name="billingStreet"]').exists()).toBe(true)
    })

    it('is not offered by a store that issues none', async () => {
      const wrapper = await mount({ formState: invoiceForm('home_delivery') })

      expect(wrapper.find('input[name="billingCompanyName"]').exists()).toBe(false)
    })
  })

  // The webside step has its own Back button; in the redesign the page
  // draws Back and Continue under the card and drives `submit()`.
  it.runIf(tree === 'webside')('emits back from the back button', async () => {
    const wrapper = await mount()

    await wrapper.find('[data-testid="step-shipping-back"]').trigger('click')

    expect(wrapper.emitted('back')).toHaveLength(1)
  })

  it.runIf(tree === 'default')('leaves Back and Continue to the page', async () => {
    const wrapper = await mount()

    expect(wrapper.find('[data-testid="step-shipping-back"]').exists()).toBe(false)
    expect(wrapper.findAll('button').filter(button => button.text() === 'Πίσω')).toHaveLength(0)
  })

  describe('what each card costs', () => {
    // The cart store outlives a test.
    beforeEach(() => {
      useCartStore().cart = makeCart()
    })

    const price = (wrapper: VueWrapper, value: string) => card(wrapper, value).text().replace(/\u00A0/g, ' ')

    /** The quote's row for a carrier's delivery, at `price`. */
    const quoted = (option: ShippingOption, rowPrice: number, waivedBy: QuoteShippingOption['waivedBy'] = null): QuoteShippingOption => makeQuoteShippingOption({
      providerCode: option.providerCode,
      providerName: option.providerName,
      kind: option.kind,
      price: rowPrice,
      waivedBy,
      exceedsMaxWeight: option.exceedsMaxWeight,
      exceedsParcelSize: option.exceedsParcelSize,
    })

    it('states the quote\'s price on each card, never the options list\'s, and "Free" only when it is 0', async () => {
      const boxNow = boxNowLockerOption({ price: 3.5 })
      const home = acsHomeDeliveryOption({ price: 9.99 })
      const wrapper = await mount({
        apiOptions: [boxNow, home],
        quotedOptions: [quoted(boxNow, 0, 'threshold'), quoted(home, 2.99)],
      })

      expect(price(wrapper, 'box_now_locker')).toContain('Δωρεάν')
      expect(price(wrapper, 'home_delivery')).toContain('2,99 €')
      expect(price(wrapper, 'home_delivery')).not.toContain('9,99 €')
    })

    it('shows a dash, not a price, while the quote has no row for a card', async () => {
      const wrapper = await mount({ quotedOptions: null })

      expect(price(wrapper, 'home_delivery')).toContain('—')
      expect(price(wrapper, 'home_delivery')).not.toContain('Δωρεάν')
    })

    it('prices a card standing for several home-delivery carriers by the one that fits the cart', async () => {
      const heavy = acsHomeDeliveryOption({ exceedsMaxWeight: true, maxWeightGrams: 1000 })
      const elta = makeShippingOption({ providerCode: 'elta', providerName: 'ELTA', priority: 20 })
      const wrapper = await mount({
        apiOptions: [heavy, elta],
        quotedOptions: [quoted(heavy, 2.99), quoted(elta, 4.2)],
      })

      expect(price(wrapper, 'home_delivery')).toContain('4,20 €')
    })

    // A free-shipping promotion is the quote's to apply (`waivedBy`), not
    // the card's: a cart flag alone frees nothing.
    it('says Free only where the quote waives the delivery', async () => {
      useCartStore().cart = makeCart({ promotionFreeShipping: true })
      const [boxNow, home] = GREEK_ROWS()
      const wrapper = await mount({ quotedOptions: [quoted(boxNow!, 0, 'promotion'), quoted(home!, 2.99)] })

      expect(price(wrapper, 'box_now_locker')).toContain('Δωρεάν')
      expect(price(wrapper, 'home_delivery')).toContain('2,99 €')
    })

    it.runIf(tree === 'default')('shows the free-delivery banner only when the chosen method costs nothing', async () => {
      const boxNow = boxNowLockerOption()
      const home = acsHomeDeliveryOption()
      const formState = makeFormState({ shippingMethod: 'home_delivery' })
      const wrapper = await mount({ formState, apiOptions: [boxNow, home], quotedOptions: [quoted(boxNow, 0), quoted(home, 2.99)] })
      expect(wrapper.find('[data-testid="step-shipping-free-delivery"]').exists()).toBe(false)

      await radio(wrapper, 'box_now_locker').trigger('click')

      expect(wrapper.find('[data-testid="step-shipping-free-delivery"]').exists()).toBe(true)
    })
  })

  describe('pay ways only one delivery choice can reach', () => {
    /**
     * BOX NOW Αντικαταβολή is settled at a locker, and the payment step
     * comes AFTER this one — so the card is the only place a shopper can
     * learn that picking a locker unlocks it.
     */
    const payWays = (...names: string[]) => names.map((key, i) => ({ id: i + 1, key }))

    it('names on each card the method only it can reach', async () => {
      const wrapper = await mount({
        apiOptions: [
          boxNowLockerOption({ payWays: payWays('CREDIT_CARD', 'BOX_NOW_PAY_ON_THE_GO') }),
          acsHomeDeliveryOption({ payWays: payWays('CREDIT_CARD', 'PAY_ON_DELIVERY') }),
        ],
      })

      const boxNow = card(wrapper, 'box_now_locker').text()
      const home = card(wrapper, 'home_delivery').text()
      expect(boxNow).toContain(t('delivery_unlocks_payment'))
      expect(boxNow).toContain(t('payment_methods.BOX_NOW_PAY_ON_THE_GO'))
      expect(boxNow).not.toContain(t('payment_methods.CREDIT_CARD'))
      expect(home).toContain(t('payment_methods.PAY_ON_DELIVERY'))
      expect(home).not.toContain(t('payment_methods.BOX_NOW_PAY_ON_THE_GO'))
    })

    it('stays silent about a method every card accepts', async () => {
      const wrapper = await mount({
        apiOptions: [
          boxNowLockerOption({ payWays: payWays('CREDIT_CARD') }),
          acsHomeDeliveryOption({ payWays: payWays('CREDIT_CARD') }),
        ],
      })

      expect(wrapper.text()).not.toContain(t('delivery_unlocks_payment'))
    })

    it('offers on a card standing for several carriers only what EVERY one of them accepts', async () => {
      // The shopper cannot pick which home-delivery carrier takes the
      // parcel, so cash on delivery accepted by ACS but not by the flat
      // rate is not actually on offer — naming it would be a promise
      // Django refuses at order time.
      const wrapper = await mount({
        apiOptions: [
          boxNowLockerOption({ payWays: payWays('CREDIT_CARD') }),
          acsHomeDeliveryOption({ payWays: payWays('CREDIT_CARD', 'PAY_ON_DELIVERY') }),
          makeShippingOption({ providerCode: 'flat_rate', priority: 20, payWays: payWays('CREDIT_CARD') }),
        ],
      })

      expect(card(wrapper, 'home_delivery').text()).not.toContain(t('payment_methods.PAY_ON_DELIVERY'))
    })

    it('renders no pay-way line when Django sends none', async () => {
      const wrapper = await mount()

      expect(wrapper.text()).not.toContain(t('delivery_unlocks_payment'))
    })
  })

  describe('a card over the carrier\'s weight cap', () => {
    it('stays visible but disabled, naming the cap in kg', async () => {
      const wrapper = await mount({
        apiOptions: [
          boxNowLockerOption({ maxWeightGrams: 4000, exceedsMaxWeight: true }),
          acsHomeDeliveryOption(),
        ],
      })

      expect(radio(wrapper, 'box_now_locker').attributes()).toHaveProperty('data-disabled')
      expect(card(wrapper, 'box_now_locker').text())
        .toContain(t('shipping.method.exceeds_max_weight', { maxWeight: '4 κιλά' }))
      expect(radio(wrapper, 'home_delivery').attributes()).not.toHaveProperty('data-disabled')
    })

    describe('a card standing for several home-delivery carriers', () => {
      const flatRate = (overrides: Partial<ShippingOption> = {}) =>
        makeShippingOption({ providerCode: 'flat_rate', providerName: 'Standard delivery', priority: 20, ...overrides })

      it('stays selectable while one carrier behind it still fits the cart', async () => {
        const wrapper = await mount({
          apiOptions: [
            boxNowLockerOption(),
            acsHomeDeliveryOption({ maxWeightGrams: 2000, exceedsMaxWeight: true }),
            flatRate(),
          ],
        })

        // One card for both carriers: the shopper picks a method, not a carrier.
        expect(radioValues(wrapper)).toEqual(['box_now_locker', 'home_delivery'])
        expect(radio(wrapper, 'home_delivery').attributes()).not.toHaveProperty('data-disabled')
      })

      it('is disabled only when every carrier behind it is over its cap, naming the largest cap', async () => {
        const wrapper = await mount({
          apiOptions: [
            boxNowLockerOption(),
            acsHomeDeliveryOption({ maxWeightGrams: 2000, exceedsMaxWeight: true }),
            flatRate({ maxWeightGrams: 3000, exceedsMaxWeight: true }),
          ],
        })

        expect(radio(wrapper, 'home_delivery').attributes()).toHaveProperty('data-disabled')
        expect(card(wrapper, 'home_delivery').text())
          .toContain(t('shipping.method.exceeds_max_weight', { maxWeight: '3 κιλά' }))
      })

      it('does not advance on a selection whose card is disabled', async () => {
        const wrapper = await mount({
          apiOptions: [
            boxNowLockerOption(),
            acsHomeDeliveryOption({ maxWeightGrams: 2000, exceedsMaxWeight: true }),
          ],
        })

        await submitStep(wrapper)

        expect(wrapper.emitted('next')).toBeUndefined()
      })
    })

    describe('when the cart is over every carrier\'s cap', () => {
      // Django refuses such an order, so the step says why once, above the cards.
      const overWeight = { cartWeight: '12,5 κιλά', maxWeight: '10 κιλά' }
      const allCapped = () => [
        boxNowLockerOption({ maxWeightGrams: 4000, exceedsMaxWeight: true }),
        acsHomeDeliveryOption({ maxWeightGrams: 10000, exceedsMaxWeight: true }),
      ]

      it('explains it once, with the cart\'s weight and the largest cap, and links to the contact page', async () => {
        const wrapper = await mount({ apiOptions: allCapped(), overWeight })

        const alert = wrapper.find('[data-testid="step-shipping-over-weight"]')
        expect(alert.text()).toContain(t('shipping.method.over_weight_title'))
        expect(alert.text()).toContain(t('shipping.method.over_weight_description', overWeight))
        const contact = alert.findAll('a').find(a => a.text() === t('shipping.method.over_weight_contact'))
        expect(contact?.attributes('href')).toBe(useLocalePath()('contact'))
      })

      it('does not advance', async () => {
        const wrapper = await mount({ apiOptions: allCapped(), overWeight })

        await submitStep(wrapper)

        expect(wrapper.emitted('next')).toBeUndefined()
      })

      it('says nothing while one carrier still fits the cart', async () => {
        const wrapper = await mount({ overWeight: null })

        expect(wrapper.find('[data-testid="step-shipping-over-weight"]').exists()).toBe(false)
      })
    })
  })

  describe('a card the cart is too large for', () => {
    it('stays visible but disabled, saying the cart does not fit the lockers', async () => {
      const wrapper = await mount({
        apiOptions: [
          boxNowLockerOption({ exceedsParcelSize: true }),
          acsHomeDeliveryOption(),
        ],
      })

      expect(radio(wrapper, 'box_now_locker').attributes()).toHaveProperty('data-disabled')
      expect(card(wrapper, 'box_now_locker').text()).toContain(t('shipping.method.exceeds_parcel_size'))
      expect(radio(wrapper, 'home_delivery').attributes()).not.toHaveProperty('data-disabled')
    })

    it('names the weight cap when the cart is both too heavy and too large', async () => {
      const wrapper = await mount({
        apiOptions: [
          boxNowLockerOption({ maxWeightGrams: 4000, exceedsMaxWeight: true, exceedsParcelSize: true }),
          acsHomeDeliveryOption(),
        ],
      })

      expect(card(wrapper, 'box_now_locker').text())
        .toContain(t('shipping.method.exceeds_max_weight', { maxWeight: '4 κιλά' }))
      expect(card(wrapper, 'box_now_locker').text()).not.toContain(t('shipping.method.exceeds_parcel_size'))
    })

    it('does not advance on it', async () => {
      const wrapper = await mount({
        apiOptions: [boxNowLockerOption({ exceedsParcelSize: true }), acsHomeDeliveryOption()],
        formState: makeFormState({ shippingMethod: 'box_now_locker', boxnowLockerId: '4' }),
      })

      await submitStep(wrapper)

      expect(wrapper.emitted('next')).toBeUndefined()
    })

    // Django places home delivery with the first carrier the cart's weight
    // fits; its parcels refusing the cart refuse the order, whatever a
    // later carrier could carry. The card follows that one carrier.
    it('disables home delivery whose carrier cannot take the cart, though a later carrier could', async () => {
      const wrapper = await mount({
        apiOptions: [
          acsHomeDeliveryOption({ exceedsParcelSize: true }),
          makeShippingOption({ providerCode: 'elta', providerName: 'ELTA', priority: 20 }),
          boxNowLockerOption(),
        ],
        formState: makeFormState({ shippingMethod: 'home_delivery' }),
      })

      expect(radio(wrapper, 'home_delivery').attributes()).toHaveProperty('data-disabled')
      expect(card(wrapper, 'home_delivery').text()).toContain(t('shipping.method.exceeds_parcel_size'))
      await submitStep(wrapper)
      expect(wrapper.emitted('next')).toBeUndefined()
    })
  })

  // Django decides where BOX NOW is offered; the storefront has no
  // setting or country list of its own that could hide it.
  it('offers BOX NOW wherever Django serves it', async () => {
    const wrapper = await mount({
      formState: makeFormState({ country: 'BG' }),
      apiOptions: [boxNowLockerOption({ countryCode: 'BG' }), acsHomeDeliveryOption()],
    })

    expect(radio(wrapper, 'box_now_locker').attributes()).not.toHaveProperty('data-disabled')
  })

  describe('when the live options failed to load', () => {
    /**
     * There is no local price to fall back to, so the step offers a
     * retry instead of cards — and the sidebar CTA, which proxies through
     * `submit()`, must not advance past it.
     */
    // The page keeps the last rows it had; only the flag says they are stale.
    const failed = () => mount({ optionsError: true })

    function button(wrapper: VueWrapper, label: string) {
      const found = wrapper.findAll('button').find(b => b.text() === label)
      if (!found) throw new Error(`no button "${label}"`)
      return found
    }

    it('renders a retry prompt instead of the method cards', async () => {
      const wrapper = await failed()

      expect(wrapper.find('[role="radiogroup"]').exists()).toBe(false)
      expect(wrapper.text()).toContain(t('shipping.method.options_error_title'))
    })

    it('asks the page to refetch from the retry button', async () => {
      const wrapper = await failed()

      await button(wrapper, 'Δοκιμάστε ξανά').trigger('click')

      expect(wrapper.emitted('retry-options')).toHaveLength(1)
    })

    it('goes back from the prompt\'s back button', async () => {
      const wrapper = await failed()

      await button(wrapper, 'Πίσω').trigger('click')

      expect(wrapper.emitted('back')).toHaveLength(1)
    })

    it('does not advance from the sidebar CTA', async () => {
      const wrapper = await failed()

      await submitStep(wrapper)

      expect(wrapper.emitted('next')).toBeUndefined()
    })
  })
})
