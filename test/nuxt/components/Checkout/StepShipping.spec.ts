/**
 * Tests for Checkout/StepShipping.vue component.
 *
 * StepShipping renders a URadioGroup with two shipping options
 * (home_delivery / box_now_locker) and conditionally shows
 * CheckoutSelectedBoxNowLocker when box_now_locker is selected.
 */

import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import StepShipping from '~/components/Checkout/StepShipping.vue'

// ---------------------------------------------------------------------------
// Helpers — keep test props centralised so future flag additions don't
// require a sweep across every test case
// ---------------------------------------------------------------------------

function makeFormState(overrides: Record<string, unknown> = {}) {
  return {
    shippingMethod: 'home_delivery',
    country: 'GR',
    boxnowLockerId: '',
    boxnowLocker: null,
    ...overrides,
  }
}

// Default ``apiOptions`` mirroring the production
// ``/api/v1/shipping/options`` response — BoxNow + ACS active, sorted
// by ``ShippingProvider.priority`` ascending (BoxNow priority=5 first
// since the owner asked for it as the leading option). Tests covering
// the hidden-row case override ``apiOptions`` to drop the relevant
// provider row.
const DEFAULT_API_OPTIONS: ShippingOption[] = [
  {
    providerCode: 'boxnow',
    providerName: 'BOX NOW',
    kind: 'pickup_point',
    price: 2.99,
    currency: 'EUR',
    liveMode: true,
    priority: 5,
    countryCode: 'GR',
    maxWeightGrams: null,
    exceedsMaxWeight: false,
    metadata: {},
    payWays: [],
  },
  {
    providerCode: 'acs',
    providerName: 'ACS Courier',
    kind: 'home_delivery',
    price: 2.99,
    currency: 'EUR',
    liveMode: true,
    priority: 10,
    countryCode: 'GR',
    maxWeightGrams: null,
    exceedsMaxWeight: false,
    metadata: {},
    payWays: [],
  },
]

function makeProps(overrides: Record<string, unknown> = {}) {
  return {
    formState: makeFormState(),
    schema: null,
    partnerId: '10391',
    // Live carrier rows — the component renders one entry per option
    // in this order. Tests that need a row hidden drop it from this
    // list rather than toggling a separate boolean flag.
    apiOptions: DEFAULT_API_OPTIONS,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Checkout/StepShipping', () => {
  describe('initial rendering', () => {
    it('mounts successfully', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps(),
      })

      expect(wrapper.exists()).toBe(true)
    })

    it('renders a URadioGroup with the two shipping option values', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps(),
      })

      const html = wrapper.html()
      // The radio items render their value attribute into the DOM
      expect(html).toContain('home_delivery')
      expect(html).toContain('box_now_locker')
    })

    it('omits the BoxNow row when no boxnow option in apiOptions (admin master switch)', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          // Backend has ``ShippingProvider(code='boxnow').is_active=False``,
          // so ``/api/v1/shipping/options`` drops the boxnow row.
          apiOptions: DEFAULT_API_OPTIONS.filter(
            o => o.providerCode !== 'boxnow',
          ),
        }),
      })

      const html = wrapper.html()
      // home_delivery still rendered, box_now_locker stripped from the
      // radio group entirely (not just disabled — see component
      // rationale: a greyed-out card invites confusion).
      expect(html).toContain('home_delivery')
      expect(html).not.toContain('box_now_locker')
    })

    it('does NOT render CheckoutSelectedBoxNowLocker when home_delivery is selected', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'home_delivery' }),
        }),
      })

      // The SelectedBoxNowLocker component is only present when isBoxNow is true
      const picker = wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' })
      expect(picker.exists()).toBe(false)
    })

    it('renders CheckoutSelectedBoxNowLocker when box_now_locker is selected', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'box_now_locker' }),
        }),
      })

      const picker = wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' })
      expect(picker.exists()).toBe(true)
    })
  })

  describe('submit() behaviour', () => {
    // The primary CTA was hoisted into the page-level checkout
    // sidebar so it sits next to the order total. The page calls
    // ``stepRef.value.submit()`` on click — which runs StepShipping's
    // locker-aware ``onSubmit`` handler. These tests drive that
    // exposed method directly instead of a removed in-card button.
    //
    // Locker-missing behaviour: pops the picker instead of silently
    // failing. Previous UX (disabled button + inline schema error)
    // lost a real customer (order 53, 2026-05-12) to ACS.
    it('submit() without a locker opens the picker instead of emitting next', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({
            shippingMethod: 'box_now_locker',
            boxnowLockerId: '',
          }),
        }),
      })

      ;((wrapper.vm as unknown as { $: { exposed: { submit: () => void } } }).$.exposed).submit()
      await wrapper.vm.$nextTick()

      // No advance to the next step yet — the shopper still has to
      // pick a locker.
      expect(wrapper.emitted('next')).toBeFalsy()
      // The picker is mounted (BoxNow keeps its iframe widget hidden
      // until ``pickerOpen`` flips true). Asserting via the child
      // component's open-model prop is the cleanest cross-cut.
      const picker = wrapper.findComponent({ name: 'CheckoutSelectedBoxNowLocker' })
      expect(picker.props('open')).toBe(true)
    })
  })

  describe('event emissions', () => {
    it('emits "next" when submit() runs with a valid home_delivery selection', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({ shippingMethod: 'home_delivery' }),
        }),
      })

      ;((wrapper.vm as unknown as { $: { exposed: { submit: () => void } } }).$.exposed).submit()
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('next')).toBeTruthy()
      expect(wrapper.emitted('next')!.length).toBeGreaterThanOrEqual(1)
    })

    it('emits "next" when submit() runs with box_now_locker AND a selected locker', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps({
          formState: makeFormState({
            shippingMethod: 'box_now_locker',
            boxnowLockerId: '4',
          }),
        }),
      })

      ;((wrapper.vm as unknown as { $: { exposed: { submit: () => void } } }).$.exposed).submit()
      await wrapper.vm.$nextTick()
      expect(wrapper.emitted('next')).toBeTruthy()
    })

    it('emits "back" when the back button is clicked', async () => {
      const wrapper = await mountSuspended(StepShipping, {
        props: makeProps(),
      })

      // Targeted selector — the URadioGroup options also render
      // [type="button"] elements for keyboard nav, so a generic
      // `[type="button"]` lookup picks the wrong element.
      const backBtn = wrapper.find('[data-testid="step-shipping-back"]')
      await backBtn.trigger('click')
      expect(wrapper.emitted('back')).toBeTruthy()
    })
  })
})

describe('exclusive pay ways on the delivery card', () => {
  /**
   * BOX NOW Αντικαταβολή can only be settled at a BoxNow locker, and
   * the payment step comes AFTER this one — so a shopper who never
   * picks a locker has no way to discover the method exists. The card
   * names it, which is why the shopper picks the locker at all.
   */
  const withPayWays = (boxnow: string[], home: string[]): ShippingOption[] => [
    {
      ...DEFAULT_API_OPTIONS[0]!,
      payWays: boxnow.map((name, i) => ({ id: i + 1, name })),
    },
    {
      ...DEFAULT_API_OPTIONS[1]!,
      payWays: home.map((name, i) => ({ id: i + 10, name })),
    },
  ]

  it('names a method only this delivery choice can reach', async () => {
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({
        apiOptions: withPayWays(
          ['CREDIT_CARD', 'BOX_NOW_PAY_ON_THE_GO'],
          ['CREDIT_CARD', 'PAY_ON_DELIVERY'],
        ),
      }),
    })

    const html = wrapper.html()
    expect(html).toContain('BOX NOW PAY ON THE GO!')
    expect(html).toContain('Αντικαταβολή')
  })

  it('stays silent about a method every row accepts', async () => {
    // Card is available everywhere, so naming it on each card is noise
    // that buries the one line that carries information.
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({
        apiOptions: withPayWays(['CREDIT_CARD'], ['CREDIT_CARD']),
      }),
    })

    expect(wrapper.html()).not.toContain('Πληρωμή με Κάρτα')
  })

  it('renders nothing when the backend sends no pay ways', async () => {
    // Older payloads, or a failure the server swallowed — the card must
    // just omit the line rather than render an empty label.
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({ apiOptions: withPayWays([], []) }),
    })

    expect(wrapper.html()).not.toContain('Επιπλέον τρόπος πληρωμής')
  })
})

describe('over-cap options (weight exceeds the carrier max)', () => {
  it('renders the option disabled with a reason instead of hiding it', async () => {
    const overCapOptions: ShippingOption[] = [
      { ...DEFAULT_API_OPTIONS[0]!, maxWeightGrams: 4000, exceedsMaxWeight: true },
      DEFAULT_API_OPTIONS[1]!,
    ]
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({ apiOptions: overCapOptions }),
    })

    // Still present — over-cap never hides the row.
    expect(wrapper.html()).toContain('box_now_locker')
    // The reason names the cap in kg (4000g -> 4kg).
    expect(wrapper.html()).toContain('4')
    const radioGroup = wrapper.findComponent({ name: 'URadioGroup' })
    const boxNowItem = (radioGroup.props('items') as Array<{ value: string, disabled?: boolean }>)
      .find(item => item.value === 'box_now_locker')
    expect(boxNowItem?.disabled).toBe(true)
  })
})

describe('one row standing for several home-delivery carriers', () => {
  const flatRate: ShippingOption = {
    ...DEFAULT_API_OPTIONS[1]!,
    providerCode: 'flat_rate',
    providerName: 'Standard delivery',
    priority: 20,
  }

  function homeItem(wrapper: Awaited<ReturnType<typeof mountSuspended>>) {
    const radioGroup = wrapper.findComponent({ name: 'URadioGroup' })
    return (radioGroup.props('items') as Array<{ value: string, disabled?: boolean }>)
      .find(item => item.value === 'home_delivery')
  }

  it('stays selectable while one carrier behind it still fits the cart', async () => {
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({
        apiOptions: [
          DEFAULT_API_OPTIONS[0]!,
          { ...DEFAULT_API_OPTIONS[1]!, maxWeightGrams: 2000, exceedsMaxWeight: true },
          flatRate,
        ],
      }),
    })

    expect(homeItem(wrapper)?.disabled).toBeFalsy()
  })

  it('is disabled only when every carrier behind it is over its cap', async () => {
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({
        apiOptions: [
          DEFAULT_API_OPTIONS[0]!,
          { ...DEFAULT_API_OPTIONS[1]!, maxWeightGrams: 2000, exceedsMaxWeight: true },
          { ...flatRate, maxWeightGrams: 3000, exceedsMaxWeight: true },
        ],
      }),
    })

    expect(homeItem(wrapper)?.disabled).toBe(true)
  })

  it('does not advance on a selection whose row is disabled', async () => {
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({
        apiOptions: [
          DEFAULT_API_OPTIONS[0]!,
          { ...DEFAULT_API_OPTIONS[1]!, maxWeightGrams: 2000, exceedsMaxWeight: true },
        ],
      }),
    })

    ;((wrapper.vm as unknown as { $: { exposed: { submit: () => void } } }).$.exposed).submit()

    expect(wrapper.emitted('next')).toBeFalsy()
  })
})

describe('BoxNow disabled for a delivery country with no widget mapping', () => {
  it('disables the BoxNow row for a country BoxNow does not serve', async () => {
    const bgOptions: ShippingOption[] = [
      { ...DEFAULT_API_OPTIONS[0]!, countryCode: 'BG' },
      DEFAULT_API_OPTIONS[1]!,
    ]
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({
        apiOptions: bgOptions,
        formState: makeFormState({ country: 'BG' }),
      }),
    })

    const radioGroup = wrapper.findComponent({ name: 'URadioGroup' })
    const boxNowItem = (radioGroup.props('items') as Array<{ value: string, disabled?: boolean }>)
      .find(item => item.value === 'box_now_locker')
    expect(boxNowItem?.disabled).toBe(true)
  })

  it('keeps BoxNow enabled for CY (a supported widget country)', async () => {
    const cyOptions: ShippingOption[] = [
      { ...DEFAULT_API_OPTIONS[0]!, countryCode: 'CY' },
    ]
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({
        apiOptions: cyOptions,
        formState: makeFormState({ country: 'CY' }),
      }),
    })

    const radioGroup = wrapper.findComponent({ name: 'URadioGroup' })
    const boxNowItem = (radioGroup.props('items') as Array<{ value: string, disabled?: boolean }>)
      .find(item => item.value === 'box_now_locker')
    expect(boxNowItem?.disabled).toBeFalsy()
  })
})

describe('optionsError (live options fetch failed)', () => {
  it('renders a retry prompt instead of the picker', async () => {
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({ optionsError: true }),
    })

    expect(wrapper.findComponent({ name: 'URadioGroup' }).exists()).toBe(false)
    const retryButtons = wrapper.findAllComponents({ name: 'UButton' })
      .filter(btn => btn.text().includes('ξανά'))
    expect(retryButtons.length).toBeGreaterThanOrEqual(1)
  })

  it('emits retry-options when the retry action is used', async () => {
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({ optionsError: true }),
    })

    const alert = wrapper.findComponent({ name: 'UAlert' })
    const retryAction = (alert.props('actions') as Array<{ label: string, onClick: () => void }>)
      .find(action => action.onClick)
    retryAction?.onClick()

    expect(wrapper.emitted('retry-options')).toBeTruthy()
  })

  it('submit() is a no-op while options failed to load', async () => {
    const wrapper = await mountSuspended(StepShipping, {
      props: makeProps({ optionsError: true }),
    })

    ;((wrapper.vm as unknown as { $: { exposed: { submit: () => void } } }).$.exposed).submit()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('next')).toBeFalsy()
  })
})
