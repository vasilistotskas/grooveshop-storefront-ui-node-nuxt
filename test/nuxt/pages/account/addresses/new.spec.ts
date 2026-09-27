/**
 * Tests for the "new address" page (app/pages/account/addresses/new.vue).
 *
 * Covers the address-book rules that changed for BoxNow Cyprus:
 *   - Countries are fetched with ``shippable: true`` — a country the
 *     store doesn't ship to can't be picked here either.
 *   - The region field's required/disabled state follows the selected
 *     country's ``hasRegions``.
 *   - The phone dial-code badge follows the form's own country field
 *     (not a hardcoded "+30").
 *
 * ``registerEndpoint`` intercepts these — the page uses ``useApi``,
 * which transports through Nuxt's own ``$fetch`` (unlike composables
 * calling ``$api``/raw ``$fetch`` directly, which bypass it).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery } from 'h3'
import NewAddressPage from '~/pages/account/addresses/new.vue'

const GR = {
  alpha2: 'GR',
  translations: { el: { name: 'Ελλάδα' } },
  phoneCode: 30,
  hasRegions: true,
  postalCodePattern: '\\d{3} ?\\d{2}',
  postalCodeExample: '151 24',
  phoneMetadata: {
    nationalNumberPattern: '5005000\\d{3}|8\\d{9,11}|(?:[269]\\d|70)\\d{8}',
    possibleLengths: [10, 11, 12],
    nationalPrefixForParsing: null,
    exampleMobile: '6912345678',
  },
}
const REGIONLESS = {
  alpha2: 'XX',
  translations: { el: { name: 'Xland' } },
  phoneCode: 999,
  hasRegions: false,
}

let countriesResponse: unknown = { count: 1, next: null, previous: null, results: [GR] }

beforeEach(() => {
  // useApi caches by its fixed 'countries' key across calls within the
  // same Nuxt app instance — without clearing, a later test's
  // registerEndpoint override never gets fetched.
  clearNuxtData()
  countriesResponse = { count: 1, next: null, previous: null, results: [GR] }
  registerEndpoint('/api/countries', () => countriesResponse)
  registerEndpoint('/api/regions', (event) => {
    const country = getQuery(event).country
    if (country === 'GR') {
      return { count: 1, next: null, previous: null, results: [{ alpha: 'ATTIKI', translations: { el: { name: 'Αττική' } } }] }
    }
    return { count: 0, next: null, previous: null, results: [] }
  })
})

describe('account/addresses/new', () => {
  it('fetches countries with shippable: true', async () => {
    let capturedQuery: Record<string, unknown> | undefined
    registerEndpoint('/api/countries', (event) => {
      capturedQuery = getQuery(event)
      return countriesResponse
    })

    await mountSuspended(NewAddressPage)

    expect(capturedQuery).toMatchObject({ shippable: 'true' })
  })

  it('shows the GR dial-code badge once GR is selected', async () => {
    // The blank new-address form starts with no country picked (unlike
    // checkout, which defaults to the first shippable country) — select
    // one first, same as a real shopper would.
    const wrapper = await mountSuspended(NewAddressPage)
    await flushPromises()
    const vm = wrapper.vm as unknown as { state: Record<string, unknown> }
    vm.state.country = 'GR'
    await flushPromises()

    expect(wrapper.html()).toContain('+30')
  })

  describe('region field follows Country.hasRegions', () => {
    const REQUIRED_MARK_CLASS = 'after:content-[\'*\']'

    it('is required for a country with regions (GR, the default)', async () => {
      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()

      const regionLabel = wrapper.findAll('label').find(l => l.text().includes('Περιφέρεια'))
      expect(regionLabel?.classes().join(' ')).toContain(REQUIRED_MARK_CLASS)
    })

    it('is not required once a regionless country is selected', async () => {
      countriesResponse = { count: 2, next: null, previous: null, results: [GR, REGIONLESS] }
      registerEndpoint('/api/countries', () => countriesResponse)

      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()

      const vm = wrapper.vm as unknown as { state: Record<string, unknown> }
      vm.state.country = 'XX'
      await flushPromises()

      const regionLabel = wrapper.findAll('label').find(l => l.text().includes('Περιφέρεια'))
      expect(regionLabel?.classes().join(' ')).not.toContain(REQUIRED_MARK_CLASS)
    })
  })
})
