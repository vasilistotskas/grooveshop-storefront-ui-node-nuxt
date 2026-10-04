import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import Checkout from '~/components/Storefront/Checkout.vue'
import WebsideCheckout from '~/components/variants/webside/Storefront/Checkout.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'

/**
 * The checkout page drives its three steps. Every forward move — the
 * primary button or a click on the progress — goes through the active
 * step's exposed `submit()`, so the per-step validation gates it; a jump
 * back is free.
 *
 * The checkout composables are replaced by the state the page reads:
 * what happens inside a step is each step component's own suite.
 */
const { state, submit, prevStep } = vi.hoisted(() => ({
  state: {
    step: 0,
    payWay: null as number | null,
    online: false,
    orderCreated: false,
    submitting: false,
    loggedIn: false,
    redemption: null as { amount: number, currency: string, points: number } | null,
  },
  submit: vi.fn(() => Promise.resolve()),
  prevStep: vi.fn(),
}))

mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(state.loggedIn),
  user: ref(state.loggedIn ? { id: 7 } : null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

mockNuxtImport('useCheckoutForm', () => () => ({
  formState: reactive({ shippingMethod: '', payWay: state.payWay }),
  selectedPayWay: ref(null),
  selectedCountry: ref(null),
  payWays: ref([]),
  shippingPrice: ref(0),
  countryOptions: ref([]),
  postcodeExample: ref(''),
  regionOptions: ref([]),
  payWayOptions: ref([]),
  step1Schema: {},
  step2Schema: {},
  step3Schema: {},
  savedAddresses: ref([]),
  selectedSavedAddressId: ref(null),
  selectSavedAddress: vi.fn(),
  addressEntryMode: ref('new'),
  useNewAddress: vi.fn(),
  b2bInvoicingEnabled: ref(false),
  acsEnabled: ref(false),
  refetchShippingOptions: vi.fn(),
  shippingOptionsError: ref(null),
  shippingOverWeight: ref(false),
  retryShippingOptions: vi.fn(),
  shippingOptions: ref([]),
}))

// A real ref, created per mount so each test starts on its own step.
let step = ref(0)
mockNuxtImport('useCheckoutSubmit', () => () => {
  step = ref(state.step)
  return {
    currentStep: step,
    addressStepErrors: ref({}),
    createdOrder: ref(state.orderCreated ? { id: 7 } : null),
    isSubmitting: ref(state.submitting),
    loyaltyDiscount: ref(state.redemption),
    giftCards: ref([]),
    giftCardBalanceTotal: ref(0),
    stockError: ref(null),
    isStripePayment: ref(false),
    isVivaWalletPayment: ref(state.online),
    isOnlinePayment: ref(state.online),
    useHostedCheckout: ref(false),
    onSubmit: vi.fn(),
    nextStep: vi.fn(),
    prevStep,
    backToForm: vi.fn(),
    onPaymentSuccess: vi.fn(),
    onPaymentError: vi.fn(),
    onLoyaltyRedeemed: vi.fn(),
    onLoyaltyCleared: vi.fn(),
    onGiftCardApplied: vi.fn(),
    onGiftCardRemoved: vi.fn(),
    fireInitiateCheckout: vi.fn(),
  }
})

/** A step body exposing `submit()`, the contract the page drives. */
const StepStub = (name: string) => defineComponent({
  name,
  setup(_props, { expose }) {
    expose({ submit })
    return () => h('div', { 'data-step': name })
  },
})

/** A part of the order summary, marked so a test can tell which are shown. */
const Part = (name: string) => defineComponent({
  name,
  setup: () => () => h('div', { 'data-part': name }),
})

const STEPS = ['CheckoutStepPersonalInfo', 'CheckoutStepShipping', 'CheckoutStepPayment']
const PARTS = ['CheckoutItems', 'CheckoutCouponInput', 'CheckoutGiftCardInput', 'CheckoutPointsEarned', 'CheckoutGuestLoyaltyCTA', 'CheckoutPointsPanel', 'LoyaltyRedemption']

const shownStep = (wrapper: VueWrapper) => wrapper.find('[data-step]').attributes('data-step')

beforeEach(() => {
  Object.assign(state, { step: 0, payWay: null, online: false, orderCreated: false, submitting: false, loggedIn: false, redemption: null })
})

describe('Checkout page (default)', () => {
  /** The points panel, showing the redemption the page hands it. */
  const PointsPanelStub = defineComponent({
    name: 'CheckoutPointsPanel',
    props: { redemption: { type: Object, default: null } },
    setup: props => () => h('div', { 'data-part': 'CheckoutPointsPanel', 'data-points': props.redemption?.points ?? '' }),
  })

  /** The summary renders its slots, so the page's choice of fields shows. */
  const SidebarStub = defineComponent({
    name: 'CheckoutSidebar',
    setup: (_props, { slots }) => () => h('div', { 'data-sidebar': '' }, Object.values(slots).map(slot => slot?.())),
  })

  async function mountOnStep(index: number, overrides: Partial<typeof state> = {}) {
    Object.assign(state, { step: index, ...overrides })
    const wrapper = await mountSuspended(Checkout, {
      route: false,
      global: {
        stubs: {
          ...Object.fromEntries(STEPS.map(name => [name, StepStub(name)])),
          ...Object.fromEntries(PARTS.map(name => [name, Part(name)])),
          CheckoutSidebar: SidebarStub,
          CheckoutPointsPanel: PointsPanelStub,
          CheckoutOnlinePaymentView: Part('CheckoutOnlinePaymentView'),
          CheckoutLegalFooter: Part('CheckoutLegalFooter'),
        },
      },
    })
    await flushPromises()
    return wrapper
  }

  const progress = (wrapper: VueWrapper) => wrapper.find('nav ol').findAll('li')
  const cta = (wrapper: VueWrapper) => wrapper.get('[data-testid="checkout-cta"]')
  const t = (key: string, params: Record<string, unknown> = {}) => useNuxtApp().$i18n.t(key, params)

  describe('progress', () => {
    it('goes back to an earlier step without validating the current one', async () => {
      const wrapper = await mountOnStep(2)

      await progress(wrapper)[0]!.get('button').trigger('click')

      expect(step.value).toBe(0)
      expect(shownStep(wrapper)).toBe('CheckoutStepPersonalInfo')
      expect(submit).not.toHaveBeenCalled()
    })

    it('advances only through the current step\'s own submit', async () => {
      const wrapper = await mountOnStep(0)

      await progress(wrapper)[1]!.get('button').trigger('click')
      await flushPromises()

      expect(submit).toHaveBeenCalledTimes(1)
      // The step's submit decides whether to advance; the click alone does not.
      expect(step.value).toBe(0)
    })

    it('offers no control for the step already shown', async () => {
      const wrapper = await mountOnStep(1)

      expect(progress(wrapper)[1]!.find('button').exists()).toBe(false)
      expect(progress(wrapper)[1]!.find('[aria-current="step"]').exists()).toBe(true)
    })

    it('lights Review once a payment method is chosen', async () => {
      const wrapper = await mountOnStep(2, { payWay: 3 })

      expect(progress(wrapper)[3]!.find('.bg-secondary').exists()).toBe(true)
    })
  })

  describe('primary button', () => {
    it.each([
      { step: 0, label: 'continue_to_delivery' },
      { step: 1, label: 'continue_to_payment' },
    ])('names the next step on step $step', async ({ step: index, label }) => {
      const wrapper = await mountOnStep(index)

      expect(cta(wrapper).text()).toBe(t(label))
    })

    it('places the order when payment happens off-line', async () => {
      const wrapper = await mountOnStep(2, { payWay: 3, online: false })

      expect(cta(wrapper).text()).toBe(t('place_order'))
    })

    it('names the amount it will charge when payment happens online', async () => {
      useCartStore().cart = makeCart({ totalPrice: 60 })

      const wrapper = await mountOnStep(2, { payWay: 3, online: true })

      expect(cta(wrapper).text()).toBe(t('pay', { total: useNuxtApp().$i18n.n(60, 'currency') }))
    })

    it('submits the active step', async () => {
      const wrapper = await mountOnStep(1)

      await cta(wrapper).trigger('click')
      await flushPromises()

      expect(submit).toHaveBeenCalledTimes(1)
    })

    it('waits for a payment method on the payment step', async () => {
      const wrapper = await mountOnStep(2, { payWay: null })

      expect(cta(wrapper).attributes('disabled')).toBeDefined()
    })

    it('gives way to the online payment once the order exists', async () => {
      const wrapper = await mountOnStep(2, { payWay: 3, online: true, orderCreated: true })

      expect(wrapper.find('[data-testid="checkout-cta"]').exists()).toBe(false)
      expect(wrapper.find('[data-part="CheckoutOnlinePaymentView"]').exists()).toBe(true)
    })
  })

  describe('back', () => {
    it('steps back from a later step', async () => {
      const wrapper = await mountOnStep(1)

      const back = wrapper.findAll('button').find(button => button.text() === t('back'))
      await back!.trigger('click')

      expect(prevStep).toHaveBeenCalledTimes(1)
    })

    it('is not offered on the first step', async () => {
      const wrapper = await mountOnStep(0)

      expect(wrapper.findAll('button').some(button => button.text() === t('back'))).toBe(false)
    })
  })

  const parts = (wrapper: VueWrapper) =>
    wrapper.find('[data-sidebar]').findAll('[data-part]').map(part => part.attributes('data-part')).sort()

  it.each([0, 1])('offers codes and gift cards while the order is filled in (step %i)', async (index) => {
    const wrapper = await mountOnStep(index)

    expect(parts(wrapper)).toEqual(['CheckoutCouponInput', 'CheckoutGiftCardInput', 'CheckoutItems', 'CheckoutPointsEarned'])
  })

  it('invites a guest to the points on the payment step instead', async () => {
    const wrapper = await mountOnStep(2)

    expect(parts(wrapper)).toEqual(['CheckoutGuestLoyaltyCTA', 'CheckoutItems', 'CheckoutPointsEarned'])
  })

  it('hands a signed-in shopper\'s points panel the redemption the order holds', async () => {
    const wrapper = await mountOnStep(2, { loggedIn: true, redemption: { amount: 5, currency: 'EUR', points: 500 } })

    expect(parts(wrapper)).toEqual(['CheckoutItems', 'CheckoutPointsEarned', 'CheckoutPointsPanel'])
    expect(wrapper.get('[data-part="CheckoutPointsPanel"]').attributes('data-points')).toBe('500')
  })
})

describe('Checkout stepper headers (frozen webside)', () => {
  async function mountOnStep(index: number) {
    state.step = index
    const stubs = Object.fromEntries(STEPS.map(name => [`Webside${name}`, StepStub(name)]))
    const wrapper = await mountSuspended(WebsideCheckout, {
      route: false,
      global: {
        stubs: {
          ...stubs,
          // The webside tree reuses the shared LoyaltyRedemption, so both spellings.
          ...Object.fromEntries(['CheckoutSidebar', ...PARTS].flatMap(name => [[name, true], [`Webside${name}`, true]])),
        },
      },
    })
    await flushPromises()
    return wrapper
  }

  async function clickHeader(wrapper: VueWrapper, index: number) {
    const headers = wrapper.findAll('[data-slot="trigger"]')
    expect(headers).toHaveLength(3)
    await headers[index]!.trigger('mousedown', { button: 0 })
    await headers[index]!.trigger('click')
    await flushPromises()
  }

  it('goes back to an earlier step without validating the current one', async () => {
    const wrapper = await mountOnStep(2)

    await clickHeader(wrapper, 0)

    expect(step.value).toBe(0)
    expect(shownStep(wrapper)).toBe('CheckoutStepPersonalInfo')
    expect(submit).not.toHaveBeenCalled()
  })

  it('advances only through the current step\'s own submit', async () => {
    const wrapper = await mountOnStep(0)

    await clickHeader(wrapper, 1)

    expect(submit).toHaveBeenCalledTimes(1)
    // The step's submit decides whether to advance; the header alone does not.
    expect(step.value).toBe(0)
  })

  it('ignores a click on the step already shown', async () => {
    const wrapper = await mountOnStep(1)

    await clickHeader(wrapper, 1)
    // Reka does not emit for the active step on a click, so the page's
    // own guard is driven with the event the stepper would send.
    wrapper.findComponent({ name: 'UStepper' }).vm.$emit('update:modelValue', 1)
    await flushPromises()

    expect(submit).not.toHaveBeenCalled()
    expect(step.value).toBe(1)
  })
})
