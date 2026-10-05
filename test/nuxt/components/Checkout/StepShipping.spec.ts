import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { DOMWrapper, VueWrapper } from '@vue/test-utils'
import { nextTick, reactive } from 'vue'
import StepShipping from '~/components/Checkout/StepShipping.vue'
import WebsideStepShipping from '~/components/variants/webside/Checkout/StepShipping.vue'
import type { ShippingOption } from '~~/shared/openapi/types.gen'
import { makeBoxNowSelectedLocker } from '~~/test/fixtures/boxnow'
import { makeCart } from '~~/test/fixtures/cart'
import {
  acsHomeDeliveryOption,
  acsSmartpointOption,
  boxNowLockerOption,
  makeShippingOption,
} from '~~/test/fixtures/shippingOptions'
import { trees } from '~~/test/helpers/trees'

/**
 * The shipping step of checkout: one radio card per delivery method the
 * store serves, in Django's priority order, plus the locker picker of the
 * chosen carrier. The page's sidebar CTA calls the step's exposed
 * `submit()` — the real contract, so the tests drive it the same way.
 *
 * The frozen webside copy differs only in the prefixed child tags
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
    partnerId: '10391',
    apiOptions: GREEK_ROWS(),
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
function submitStep(wrapper: VueWrapper): void {
  ;(wrapper.vm as unknown as { $: { exposed: { submit: () => void } } }).$.exposed.submit()
}

const t = (key: string, params: Record<string, unknown> = {}): string => useNuxtApp().$i18n.t(key, params)

describe.each(trees(StepShipping, WebsideStepShipping))('$tree Checkout/StepShipping', ({ tree, C, own }) => {
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
  })

  describe('the locker picker of the chosen carrier', () => {
    it('mounts no locker picker for home delivery', async () => {
      const wrapper = await mount()

      expect(wrapper.findComponent({ name: own('CheckoutSelectedBoxNowLocker') }).exists()).toBe(false)
      expect(wrapper.findComponent({ name: own('CheckoutSelectedGenericLocker') }).exists()).toBe(false)
    })

    it('mounts the BoxNow picker when the shopper clicks the BoxNow card', async () => {
      const formState = makeFormState()
      const wrapper = await mount({ formState })

      await radio(wrapper, 'box_now_locker').trigger('click')

      expect(formState.shippingMethod).toBe('box_now_locker')
      const picker = wrapper.findComponent({ name: own('CheckoutSelectedBoxNowLocker') })
      expect(picker.exists()).toBe(true)
      expect(picker.props('partnerId')).toBe('10391')
    })

    it('opens the BoxNow widget on the delivery country\'s map (CY)', async () => {
      const wrapper = await mount({
        formState: makeFormState({ shippingMethod: 'box_now_locker', country: 'CY' }),
        apiOptions: [boxNowLockerOption({ countryCode: 'CY', price: 4.5 })],
      })

      const widget = wrapper.findComponent({ name: 'CheckoutBoxNowLockerPicker' })
      expect(widget.props('countryCode')).toBe('CY')
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
        initialCity: 'Χαλάνδρι',
        countryCode: 'GR',
      })
      expect(picker.props('carrier').code).toBe('acs')
      expect(wrapper.findComponent({ name: own('CheckoutSelectedBoxNowLocker') }).exists()).toBe(false)
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
      boxnowLocker: makeBoxNowSelectedLocker(),
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

      submitStep(wrapper)

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
          boxnowLocker: makeBoxNowSelectedLocker({ boxnowLockerCountryCode: country }),
        }),
        apiOptions,
      })

      submitStep(wrapper)

      expect(wrapper.emitted('next')).toHaveLength(1)
    })

    it('opens the picker instead of advancing when no locker is picked yet', async () => {
      // A disabled Continue with no hint lost a real customer (order 53,
      // 2026-05-12) to a competitor; the picker now opens on the click.
      const wrapper = await mount({ formState: makeFormState({ shippingMethod: 'box_now_locker' }) })
      const picker = wrapper.findComponent({ name: own('CheckoutSelectedBoxNowLocker') })
      expect(picker.props('open')).toBe(false)

      submitStep(wrapper)
      await nextTick()

      expect(wrapper.emitted('next')).toBeUndefined()
      expect(picker.props('open')).toBe(true)
    })

    it('does not advance on a method the store no longer serves', async () => {
      const wrapper = await mount({
        formState: makeFormState({ shippingMethod: 'box_now_locker', boxnowLockerId: '4' }),
        apiOptions: [acsHomeDeliveryOption()],
      })

      submitStep(wrapper)

      expect(wrapper.emitted('next')).toBeUndefined()
    })
  })

  // The frozen step has its own Back button; in the redesign the page
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

  describe.runIf(tree === 'default')('what each card costs', () => {
    // The cart store outlives a test.
    beforeEach(() => {
      useCartStore().cart = makeCart()
    })

    const price = (wrapper: VueWrapper, value: string) => card(wrapper, value).text().replace(/\u00A0/g, ' ')

    it('states the API price on each card, and "Free" only when it is 0', async () => {
      const wrapper = await mount({ apiOptions: [boxNowLockerOption({ price: 0 }), acsHomeDeliveryOption({ price: 2.99 })] })

      expect(price(wrapper, 'box_now_locker')).toContain('Δωρεάν')
      expect(price(wrapper, 'home_delivery')).toContain('2,99 €')
      expect(price(wrapper, 'home_delivery')).not.toContain('Δωρεάν')
    })

    it('prices a card standing for several home-delivery carriers by the one that fits the cart', async () => {
      const wrapper = await mount({
        apiOptions: [
          acsHomeDeliveryOption({ price: 2.99, exceedsMaxWeight: true, maxWeightGrams: 1000 }),
          makeShippingOption({ providerCode: 'elta', providerName: 'ELTA', priority: 20, price: 4.2 }),
        ],
      })

      expect(price(wrapper, 'home_delivery')).toContain('4,20 €')
    })

    it('says Free on every card when a promotion gives free shipping', async () => {
      useCartStore().cart = makeCart({ promotionFreeShipping: true })
      const wrapper = await mount()

      expect(price(wrapper, 'box_now_locker')).toContain('Δωρεάν')
      expect(price(wrapper, 'home_delivery')).toContain('Δωρεάν')
    })

    it('shows the free-delivery banner only when the chosen method costs nothing', async () => {
      const apiOptions = [boxNowLockerOption({ price: 0 }), acsHomeDeliveryOption({ price: 2.99 })]
      const formState = makeFormState({ shippingMethod: 'home_delivery' })
      const wrapper = await mount({ formState, apiOptions })
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

        submitStep(wrapper)

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

        submitStep(wrapper)

        expect(wrapper.emitted('next')).toBeUndefined()
      })

      it('says nothing while one carrier still fits the cart', async () => {
        const wrapper = await mount({ overWeight: null })

        expect(wrapper.find('[data-testid="step-shipping-over-weight"]').exists()).toBe(false)
      })
    })
  })

  describe('BoxNow where it cannot run', () => {
    it('disables BoxNow for a delivery country it has no map for, and says why', async () => {
      const wrapper = await mount({
        formState: makeFormState({ country: 'BG' }),
        apiOptions: [boxNowLockerOption({ countryCode: 'BG' }), acsHomeDeliveryOption()],
      })

      expect(radio(wrapper, 'box_now_locker').attributes()).toHaveProperty('data-disabled')
      expect(card(wrapper, 'box_now_locker').text()).toContain(t('shipping.method.boxnow.country_unsupported'))
    })

    it('keeps BoxNow enabled in Cyprus, a country it serves', async () => {
      const wrapper = await mount({
        formState: makeFormState({ country: 'CY' }),
        apiOptions: [boxNowLockerOption({ countryCode: 'CY' })],
      })

      expect(radio(wrapper, 'box_now_locker').attributes()).not.toHaveProperty('data-disabled')
      expect(wrapper.text()).not.toContain(t('shipping.method.boxnow.country_unsupported'))
    })

    it('disables BoxNow and explains it when the store has no BoxNow partner id', async () => {
      // The widget cannot load without one — the picker would throw
      // "partnerId is required" into the checkout's generic error toast.
      const wrapper = await mount({ partnerId: '' })

      expect(radio(wrapper, 'box_now_locker').attributes()).toHaveProperty('data-disabled')
      expect(wrapper.text()).toContain(t('shipping.method.boxnow.unconfigured_title'))
      // Not the country reason: the country is fine, the setup is not.
      expect(wrapper.text()).not.toContain(t('shipping.method.boxnow.country_unsupported'))
    })

    it('says nothing about a missing partner id when the store does not serve BoxNow', async () => {
      const wrapper = await mount({ partnerId: '', apiOptions: [acsHomeDeliveryOption()] })

      expect(wrapper.text()).not.toContain(t('shipping.method.boxnow.unconfigured_title'))
    })
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

      submitStep(wrapper)

      expect(wrapper.emitted('next')).toBeUndefined()
    })
  })
})
