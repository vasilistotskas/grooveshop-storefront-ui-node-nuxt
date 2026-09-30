import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { defineComponent, h, reactive, ref } from 'vue'
import Checkout from '~/components/Storefront/Checkout.vue'
import WebsideCheckout from '~/components/variants/webside/Storefront/Checkout.vue'

/**
 * The stepper headers are clickable, and a click must not bypass the
 * per-step validation: a jump BACK is free (the shopper already passed
 * those checks), a jump FORWARD goes through the active step's exposed
 * `submit()` — the same call the sidebar CTA makes — and a click on the
 * current step does nothing.
 *
 * The checkout composables are replaced by the state the page reads:
 * what happens inside a step is each step component's own suite.
 */
const { currentStep, submit } = vi.hoisted(() => ({
  currentStep: { value: 0 },
  submit: vi.fn(() => Promise.resolve()),
}))

mockNuxtImport('useCheckoutForm', () => () => ({
  formState: reactive({ shippingMethod: '', payWay: null }),
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
  retryShippingOptions: vi.fn(),
  shippingOptions: ref([]),
}))

// A real ref, created per mount so each test starts on its own step.
let step = ref(0)
mockNuxtImport('useCheckoutSubmit', () => () => {
  step = ref(currentStep.value)
  return {
    currentStep: step,
    addressStepErrors: ref({}),
    createdOrder: ref(null),
    isSubmitting: ref(false),
    loyaltyDiscount: ref(null),
    giftCards: ref([]),
    giftCardBalanceTotal: ref(0),
    stockError: ref(null),
    isStripePayment: ref(false),
    isVivaWalletPayment: ref(false),
    isOnlinePayment: ref(false),
    useHostedCheckout: ref(false),
    onSubmit: vi.fn(),
    nextStep: vi.fn(),
    prevStep: vi.fn(),
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

const STEPS = ['CheckoutStepPersonalInfo', 'CheckoutStepShipping', 'CheckoutStepPayment']
const SIDEBAR = ['CheckoutSidebar', 'CheckoutItems', 'CheckoutCouponInput', 'CheckoutGiftCardInput', 'CheckoutPointsEarned', 'CheckoutGuestLoyaltyCTA', 'LoyaltyRedemption']

describe.each([
  ['default', Checkout, ''],
  ['webside', WebsideCheckout, 'Webside'],
])('Checkout stepper headers (%s tree)', (_tree, Component, prefix) => {
  async function mountOnStep(index: number) {
    currentStep.value = index
    const stubs = Object.fromEntries(STEPS.map(name => [`${prefix}${name}`, StepStub(name)]))
    const wrapper = await mountSuspended(Component, {
      route: false,
      global: {
        stubs: {
          ...stubs,
          // The webside tree reuses the shared LoyaltyRedemption, so both spellings.
          ...Object.fromEntries(SIDEBAR.flatMap(name => [[name, true], [`${prefix}${name}`, true]])),
        },
      },
    })
    await flushPromises()
    return wrapper
  }

  async function clickHeader(wrapper: Awaited<ReturnType<typeof mountOnStep>>, index: number) {
    const headers = wrapper.findAll('[data-slot="trigger"]')
    expect(headers).toHaveLength(3)
    await headers[index]!.trigger('mousedown', { button: 0 })
    await headers[index]!.trigger('click')
    await flushPromises()
  }

  const shownStep = (wrapper: Awaited<ReturnType<typeof mountOnStep>>) =>
    wrapper.find('[data-step]').attributes('data-step')

  beforeEach(() => {
    currentStep.value = 0
  })

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
