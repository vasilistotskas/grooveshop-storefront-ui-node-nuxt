/**
 * Integration test for the ACS address-suggestion chip.
 *
 * Mounted at the component level (not the full checkout page) for the
 * same reasons documented in checkout-boxnow-flow.spec.ts: the full
 * page mount requires ~10 composable mocks and is brittle to
 * structural changes. Component-level coverage is enough because the
 * chip is self-contained — it reads/writes the form-state model and
 * calls one Nuxt server proxy.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { reactive, nextTick } from 'vue'
import AcsAddressSuggestion from '~/components/Checkout/AcsAddressSuggestion.vue'

// ACS proxy stub — every test that exercises the watcher swaps in
// the desired response via the `addressValidationResponse` ref so
// tests don't have to coordinate registerEndpoint state.
const addressValidationResponse = {
  current: null as Record<string, unknown> | null,
}
registerEndpoint('/api/shipping/acs/address-validation', {
  method: 'POST',
  handler: () => addressValidationResponse.current,
})

// Mock useAcsAddressValidation so we control its behaviour directly
// in each test rather than waiting for the debounced watcher to fire
// against the (mocked) endpoint above.  Both layers of indirection
// stay in sync because the composable is what the component actually
// imports.
const validateMock = vi.fn()
const cancelMock = vi.fn()
const resolvedRef = { value: null as Record<string, unknown> | null }
const isLoadingRef = { value: false }
const errorRef = { value: null as string | null }

vi.mock('~/composables/useAcsAddressValidation', () => ({
  useAcsAddressValidation: () => ({
    resolved: resolvedRef,
    isLoading: isLoadingRef,
    errorMessage: errorRef,
    validate: validateMock,
    cancel: cancelMock,
  }),
}))

beforeAll(() => {
  // Required because the component composable usually pulls $i18n via
  // useNuxtApp inside its imports — the @nuxt/test-utils runtime
  // injects $i18n already, but the dependency chain mocks need the
  // global stub for $fetch to be a no-op when the validate call ends
  // up reaching it.  Stubbed at suite level (not module level) so it
  // doesn't break Nuxt env init.
  vi.stubGlobal('$fetch', vi.fn(async () => addressValidationResponse.current))
})

afterAll(() => vi.unstubAllGlobals())

describe('CheckoutAcsAddressSuggestion', () => {
  it('does not render when enabled=false', async () => {
    const formState = reactive({
      street: 'Πειραιώς',
      streetNumber: '25',
      zipcode: '17778',
      city: 'Ταύρος',
    })

    const wrapper = await mountSuspended(AcsAddressSuggestion, {
      props: { formState, enabled: false },
    })

    expect(wrapper.find('[icon="i-lucide-map-pin-check"]').exists()).toBe(
      false,
    )
    expect(cancelMock).toHaveBeenCalled()
  })

  it('triggers validate() when all four fields are populated', async () => {
    validateMock.mockClear()
    const formState = reactive({
      street: 'Πειραιώς',
      streetNumber: '25',
      zipcode: '17778',
      city: 'Ταύρος',
    })

    await mountSuspended(AcsAddressSuggestion, {
      props: { formState, enabled: true },
    })
    await nextTick()

    expect(validateMock).toHaveBeenCalled()
    const lastCall = validateMock.mock.calls.at(-1)
    expect(lastCall?.[0]).toContain('17778')
  })

  it('does not trigger validate() when any field is empty', async () => {
    validateMock.mockClear()
    const formState = reactive({
      street: 'Πειραιώς',
      streetNumber: '',
      zipcode: '17778',
      city: 'Ταύρος',
    })

    await mountSuspended(AcsAddressSuggestion, {
      props: { formState, enabled: true },
    })
    await nextTick()

    expect(validateMock).not.toHaveBeenCalled()
  })

  it('renders the suggestion chip when ACS returns a divergent zip', async () => {
    resolvedRef.value = {
      resolvedStreet: 'ΠΕΙΡΑΙΩΣ',
      resolvedStreetNum: '25',
      resolvedZip: '17778',
      resolvedArea: 'ΤΑΥΡΟΣ',
    }
    const formState = reactive({
      street: 'Pireos', // typed in Latin
      streetNumber: '25',
      zipcode: '11111', // wrong
      city: 'Ταύρος',
    })

    const wrapper = await mountSuspended(AcsAddressSuggestion, {
      props: { formState, enabled: true },
    })
    await nextTick()

    const html = wrapper.html()
    expect(html).toContain('17778')
  })

  it('hides the chip when ACS resolution matches the typed values', async () => {
    resolvedRef.value = {
      resolvedStreet: 'Πειραιώς',
      resolvedStreetNum: '25',
      resolvedZip: '17778',
      resolvedArea: 'Ταύρος',
    }
    const formState = reactive({
      street: 'Πειραιώς',
      streetNumber: '25',
      zipcode: '17778',
      city: 'Ταύρος',
    })

    const wrapper = await mountSuspended(AcsAddressSuggestion, {
      props: { formState, enabled: true },
    })
    await nextTick()

    expect(wrapper.find('[icon="i-lucide-map-pin-check"]').exists()).toBe(
      false,
    )
  })
})
