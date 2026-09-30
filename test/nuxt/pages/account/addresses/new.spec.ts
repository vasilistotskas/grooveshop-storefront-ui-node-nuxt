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
import { makeCountry } from '~~/test/fixtures/country'

const GR = makeCountry()
const CY = makeCountry({
  alpha2: 'CY',
  alpha3: 'CYP',
  isoCc: 196,
  phoneCode: 357,
  sortOrder: 2,
  translations: { el: { name: 'Κύπρος' }, en: { name: 'Cyprus' } },
  postalCodePattern: '\\d{4}',
  postalCodeExample: '1010',
  phoneMetadata: {
    nationalNumberPattern: '(?:[279]\\d|[58]0)\\d{6}',
    possibleLengths: [8],
    nationalPrefixForParsing: null,
    exampleMobile: '96123456',
  },
})
/** A country with no regions, postal-code rule or phone metadata. */
const REGIONLESS = makeCountry({
  alpha2: 'XX',
  alpha3: 'XXX',
  isoCc: null,
  phoneCode: 999,
  sortOrder: 3,
  translations: { el: { name: 'Xland' } },
  hasRegions: false,
  postalCodePattern: undefined,
  postalCodeExample: undefined,
  phoneMetadata: null,
})

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
    if (country === 'CY') {
      return { count: 1, next: null, previous: null, results: [{ alpha: 'CY-01', translations: { el: { name: 'Λευκωσία' } } }] }
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
      const { wrapper, vm } = await mountWithCountry('CY')
      mockApi.mockReset().mockResolvedValue({})
      const saves = () => mockApi.mock.calls.filter(([url]) => url === '/api/user/addresses')
      const phoneError = useNuxtApp().$i18n.t('validation.phone.invalid_example', { example: '6912345678' })
      // A complete Cypriot address: CY postcode and district.
      Object.assign(vm.state, VALID, { country: 'CY', zipcode: '1010', city: 'Λευκωσία', region: 'CY-01' })
      await flushPromises()

      // A well-formed E.164 that no Greek number matches: judged by the
      // picked +30's own rules (not the generic foreign check the form
      // country would apply), and the message names a GREEK example.
      await wrapper.find('input[type="tel"]').setValue('+30 1234567890')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(saves()).toEqual([])
      expect(wrapper.text()).toContain(phoneError)

      // A Greek mobile on a Cypriot address: +30 picked, checked against GR.
      await wrapper.find('input[type="tel"]').setValue('+30 6912345678')
      await wrapper.find('form').trigger('submit')
      await flushPromises()
      expect(wrapper.text()).not.toContain(phoneError)
      expect(saves()).toHaveLength(1)
      expect(saves()[0]![1].body).toMatchObject({ country: 'CY', phone: '+306912345678' })
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

    it('puts autocomplete="country" and "address-level1" on native selects autofill can fill', async () => {
      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()
      const vm = wrapper.vm as unknown as { state: Record<string, unknown> }
      vm.state.country = 'GR'
      await flushPromises()

      // A combobox button ignores `autocomplete`; USelect's hidden native
      // <select> does not.
      expect(wrapper.find('select[autocomplete="country"]').exists()).toBe(true)
      expect(wrapper.find('select[autocomplete="address-level1"]').exists()).toBe(true)
      expect(wrapper.find('button[autocomplete]').exists()).toBe(false)
      // USelect is not full-width by default (unlike the inputs beside it).
      for (const label of ['Χώρα', 'Περιφέρεια']) {
        expect(wrapper.find(`button[aria-label="${label}"]`).classes()).toContain('w-full')
      }
    })

    it('renders the phone field at the same size as the other inputs', async () => {
      const wrapper = await mountSuspended(NewAddressPage)
      await flushPromises()

      const heightClasses = (input: { classes: () => string[] }) => input.classes().filter(name => /^(?:py|px|text)-/.test(name)).sort()
      const phone = wrapper.find('input[type="tel"]')
      const street = wrapper.find('input[autocomplete="address-line1"]')
      expect(heightClasses(phone)).toEqual(heightClasses(street).filter(name => !name.startsWith('ps-')))
      // The picker button matches the input's vertical padding too.
      expect(wrapper.findComponent({ name: 'USelectMenu' }).find('button').classes()).toContain('py-2')
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
