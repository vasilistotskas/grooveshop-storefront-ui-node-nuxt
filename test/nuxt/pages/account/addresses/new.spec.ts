/**
 * Tests for the "new address" page (app/pages/account/addresses/new.vue).
 *
 * Covers the address-book rules that changed for BoxNow Cyprus:
 *   - Countries are fetched with ``shippable: true`` — a country the
 *     store doesn't ship to can't be picked here either.
 *   - The region field's required/disabled state follows the selected
 *     country's ``hasRegions``.
 *   - The phone field is the flag picker: it follows the form's own
 *     country field until a phone country is picked, and the form
 *     submits E.164.
 *   - Country comes before the street, with autofill tokens on the selects.
 *
 * ``registerEndpoint`` intercepts these — the page uses ``useApi``,
 * which transports through Nuxt's own ``$fetch`` (unlike composables
 * calling ``$api``/raw ``$fetch`` directly, which bypass it).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
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
const CY = {
  alpha2: 'CY',
  translations: { el: { name: 'Κύπρος' } },
  phoneCode: 357,
  hasRegions: true,
  postalCodePattern: '\d{4}',
  postalCodeExample: '1010',
  phoneMetadata: {
    nationalNumberPattern: '(?:[279]\d|[58]0)\d{6}',
    possibleLengths: [8],
    nationalPrefixForParsing: null,
    exampleMobile: '96123456',
  },
}
const REGIONLESS = {
  alpha2: 'XX',
  translations: { el: { name: 'Xland' } },
  phoneCode: 999,
  hasRegions: false,
}

const { mockApi } = vi.hoisted(() => ({ mockApi: vi.fn() }))
// The submit goes through `$api`; reads go through `useApi` (registerEndpoint).
mockNuxtImport('$api', () => mockApi)

// A complete, valid address (country / region / phone set per test).
const VALID = {
  title: 'Home',
  firstName: 'Test',
  lastName: 'User',
  street: 'Main St',
  streetNumber: '1',
  city: 'Athens',
  zipcode: '151 24',
  region: 'ATTIKI',
  isMain: false,
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
      // The phone picker reads the unpaginated list from the same route.
      if (getQuery(event).shippable) capturedQuery = getQuery(event)
      return countriesResponse
    })

    await mountSuspended(NewAddressPage)

    expect(capturedQuery).toMatchObject({ shippable: 'true' })
  })

  describe('phone flag picker', () => {
    async function mountWithCountry(alpha2 = 'GR') {
      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()
      const vm = wrapper.vm as unknown as { state: Record<string, unknown> }
      vm.state.country = alpha2
      await flushPromises()
      return { wrapper, vm }
    }

    it('follows the form country: its flag on the picker, its code before the digits', async () => {
      const { wrapper } = await mountWithCountry('GR')

      const picker = wrapper.findComponent({ name: 'USelectMenu', props: undefined })
      expect(wrapper.html()).toContain('Κωδικός χώρας τηλεφώνου: Ελλάδα (+30)')
      const phone = wrapper.find('input[type="tel"]')
      expect(phone.attributes('autocomplete')).toBe('tel')
      expect(phone.attributes('placeholder')).toBe('6912345678')
      expect(phone.element.parentElement!.querySelector('span.absolute')!.textContent).toContain('+30')
      expect(picker.exists()).toBe(true)
    })

    it('stores E.164 built from the picked country and the digits', async () => {
      const { wrapper, vm } = await mountWithCountry('GR')

      await wrapper.find('input[type="tel"]').setValue('6912345678')
      await flushPromises()

      expect(vm.state.phone).toBe('+306912345678')
    })

    it('parses a saved E.164 into the picker and the digits', async () => {
      countriesResponse = { count: 2, next: null, previous: null, results: [GR, CY] }
      registerEndpoint('/api/countries', () => countriesResponse)
      const { wrapper, vm } = await mountWithCountry('GR')

      vm.state.phone = '+35796123456'
      await flushPromises()

      expect(wrapper.find<HTMLInputElement>('input[type="tel"]').element.value).toBe('96123456')
      expect(wrapper.html()).toContain('Κωδικός χώρας τηλεφώνου: Κύπρος')
    })

    it('validates against the picked phone country, not the form country', async () => {
      countriesResponse = { count: 2, next: null, previous: null, results: [GR, CY] }
      registerEndpoint('/api/countries', () => countriesResponse)
      const { wrapper } = await mountWithCountry('CY')

      // A Greek mobile on a Cypriot address: +30 picked, checked against GR.
      await wrapper.find('input[type="tel"]').setValue('+30 6912345678')
      await flushPromises()

      const vm = wrapper.vm as unknown as { schema: { safeParse: (data: unknown) => { error?: { issues: Array<{ path: unknown[] }> } } } }
      const valid = vm.schema.safeParse({ ...VALID, country: 'CY', phone: '+306912345678' })
      expect(valid.error?.issues.some(issue => issue.path[0] === 'phone') ?? false).toBe(false)
      const invalid = vm.schema.safeParse({ ...VALID, country: 'CY', phone: '+30123' })
      expect(invalid.error?.issues.some(issue => issue.path[0] === 'phone')).toBe(true)
    })

    it('submits the E.164 the field built', async () => {
      const { wrapper, vm } = await mountWithCountry('GR')
      mockApi.mockReset().mockResolvedValue({})

      Object.assign(vm.state, VALID, { country: 'GR', region: 'ATTIKI' })
      await wrapper.find('input[type="tel"]').setValue('6912345678')
      await flushPromises()
      await wrapper.find('form').trigger('submit')
      await flushPromises()

      const call = mockApi.mock.calls.find(([url]) => url === '/api/user/addresses')
      expect(call?.[1]?.body.phone).toBe('+306912345678')
    })
  })

  describe('country first, with autofill tokens', () => {
    it('lists the country field before the street', async () => {
      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()

      const names = wrapper.findAll('[name]').map(element => element.attributes('name'))
      expect(names.indexOf('country')).toBeGreaterThan(-1)
      expect(names.indexOf('country')).toBeLessThan(names.indexOf('street'))
    })

    it('puts autocomplete="country" and "address-level1" on the selects', async () => {
      const { html } = await (async () => {
        const wrapper = await mountSuspended(NewAddressPage)
        await flushPromises()
        const vm = wrapper.vm as unknown as { state: Record<string, unknown> }
        vm.state.country = 'GR'
        await flushPromises()
        return { html: wrapper.html() }
      })()

      expect(html).toContain('autocomplete="country"')
      expect(html).toContain('autocomplete="address-level1"')
    })
  })

  describe('region field follows Country.hasRegions', () => {
    it('renders, required, for a country with regions (GR)', async () => {
      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()
      const vm = wrapper.vm as unknown as { state: Record<string, unknown> }
      vm.state.country = 'GR'
      await flushPromises()

      const regionLabel = wrapper.findAll('label').find(l => l.text().includes('Περιφέρεια'))
      expect(regionLabel).toBeDefined()
      expect(regionLabel?.classes().join(' ')).toContain('after:content-[\'*\']')
    })

    it('is not rendered at all once a regionless country is selected', async () => {
      countriesResponse = { count: 2, next: null, previous: null, results: [GR, REGIONLESS] }
      registerEndpoint('/api/countries', () => countriesResponse)

      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()

      const vm = wrapper.vm as unknown as { state: Record<string, unknown> }
      vm.state.country = 'XX'
      await flushPromises()

      const regionLabel = wrapper.findAll('label').find(l => l.text().includes('Περιφέρεια'))
      expect(regionLabel).toBeUndefined()
    })
  })
})
