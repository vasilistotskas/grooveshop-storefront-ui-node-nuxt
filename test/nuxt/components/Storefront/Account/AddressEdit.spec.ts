/**
 * Tests for the "edit address" page body (app/components/Storefront/Account/AddressEdit.vue).
 *
 * The saved phone is E.164 and is parsed back into the flag picker plus the
 * national digits; the form validates and submits E.164 against the country
 * picked in the phone field; the country comes before the street with
 * autofill tokens on the selects.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery } from 'h3'
import EditAddressPage from '~/components/Storefront/Account/AddressEdit.vue'

const { mockApi } = vi.hoisted(() => ({ mockApi: vi.fn() }))
mockNuxtImport('$api', () => mockApi)
// The page reads the address id from its route.
mockNuxtImport('useRoute', () => () => ({ params: { id: '5' }, query: {}, path: '/account/addresses/5/edit' }))

function country(alpha2: string, phoneCode: number, el: string, exampleMobile: string, zip: [string, string], phone: [string, number[]]) {
  return {
    alpha2,
    phoneCode,
    translations: { el: { name: el } },
    hasRegions: true,
    postalCodePattern: zip[0],
    postalCodeExample: zip[1],
    phoneMetadata: {
      nationalNumberPattern: phone[0],
      possibleLengths: phone[1],
      nationalPrefixForParsing: null,
      exampleMobile,
    },
  }
}
const GR = country('GR', 30, 'Ελλάδα', '6912345678', ['\\d{3} ?\\d{2}', '151 24'], ['(?:[269]\\d|70)\\d{8}', [10]])
const CY = country('CY', 357, 'Κύπρος', '96123456', ['\\d{4}', '1010'], ['(?:[279]\\d|[58]0)\\d{6}', [8]])

const REGIONLESS = { ...country('XX', 999, 'Xland', '12345678', ['\\d{4}', '1234'], ['\\d{8}', [8]]), hasRegions: false }

let savedPhone = '+35796123456'
let regionRequests: unknown[] = []

beforeEach(() => {
  clearNuxtData()
  savedPhone = '+35796123456'
  regionRequests = []
  registerEndpoint('/api/countries', () => ({ count: 3, next: null, previous: null, results: [GR, CY, REGIONLESS] }))
  registerEndpoint('/api/regions', (event) => {
    const { country } = getQuery(event)
    regionRequests.push(country)
    const results = country === 'GR'
      ? [{ alpha: 'ATTIKI', translations: { el: { name: 'Αττική' } } }]
      : country === 'CY'
        ? [{ alpha: 'CY-01', translations: { el: { name: 'Λευκωσία' } } }]
        : []
    return { count: results.length, next: null, previous: null, results }
  })
  registerEndpoint('/api/user/addresses/5', () => ({
    id: 5,
    title: 'Home',
    firstName: 'Test',
    lastName: 'User',
    street: 'Main St',
    streetNumber: '1',
    city: 'Athens',
    zipcode: '151 24',
    phone: savedPhone,
    country: 'GR',
    region: 'ATTIKI',
    isMain: false,
  }))
})

async function mountPage() {
  const wrapper = await mountSuspended(EditAddressPage)
  await flushPromises()
  return { wrapper, vm: wrapper.vm as unknown as { state: Record<string, unknown> } }
}

describe('account/addresses/[id]/edit phone flag picker', () => {
  it('parses a saved E.164 into the picker country and the national digits', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.find<HTMLInputElement>('input[type="tel"]').element.value).toBe('96123456')
    expect(wrapper.html()).toContain('Κωδικός χώρας τηλεφώνου: Κύπρος (+357)')
  })

  it('leaves a saved number of the address\'s own country following it', async () => {
    savedPhone = '+306912345678'
    const { wrapper } = await mountPage()

    expect(wrapper.find<HTMLInputElement>('input[type="tel"]').element.value).toBe('6912345678')
    expect(wrapper.html()).toContain('Κωδικός χώρας τηλεφώνου: Ελλάδα (+30)')
  })

  it('submits the E.164 the field built', async () => {
    mockApi.mockReset().mockResolvedValue({})
    const { wrapper } = await mountPage()

    await wrapper.find('input[type="tel"]').setValue('+30 6912345678')
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const call = mockApi.mock.calls.find(([url]) => url === '/api/user/addresses/5')
    expect(call?.[1]?.body.phone).toBe('+306912345678')
  })

  it('validates against the picked phone country, not the address\'s', async () => {
    mockApi.mockReset().mockResolvedValue({})
    const { wrapper } = await mountPage()
    const saves = () => mockApi.mock.calls.filter(([url]) => url === '/api/user/addresses/5')
    const phoneError = useNuxtApp().$i18n.t('validation.phone.invalid_example', { example: '96123456' })

    // The +357 pick from the saved number on a Greek address: a 10-digit
    // Greek mobile is wrong for it, and the message names a Cypriot one.
    await wrapper.find('input[type="tel"]').setValue('6912345678')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(saves()).toEqual([])
    expect(wrapper.text()).toContain(phoneError)

    await wrapper.find('input[type="tel"]').setValue('96123456')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).not.toContain(phoneError)
    expect(saves()).toHaveLength(1)
    expect(saves()[0]![1].body.phone).toBe('+35796123456')
  })
})

describe('account/addresses/[id]/edit country first', () => {
  it('lists the country field before the street', async () => {
    const { wrapper } = await mountPage()

    const names = wrapper.findAll('[name]').map(element => element.attributes('name'))
    expect(names.indexOf('country')).toBeGreaterThan(-1)
    expect(names.indexOf('country')).toBeLessThan(names.indexOf('street'))
  })

  it('puts autocomplete="country" and "address-level1" on native selects autofill can fill', async () => {
    const { wrapper } = await mountPage()

    expect(wrapper.find('select[autocomplete="country"]').exists()).toBe(true)
    expect(wrapper.find('select[autocomplete="address-level1"]').exists()).toBe(true)
    expect(wrapper.find('button[autocomplete]').exists()).toBe(false)
    // USelect is not full-width by default (unlike the inputs beside it).
    for (const label of ['Χώρα', 'Περιφέρεια']) {
      expect(wrapper.find(`button[aria-label="${label}"]`).classes()).toContain('w-full')
    }
  })

  it('renders the phone field at the same size as the other inputs', async () => {
    const { wrapper } = await mountPage()

    const paddingClasses = (input: { classes: () => string[] }) => input.classes().filter(name => /^(?:py|px)-/.test(name)).sort()
    expect(paddingClasses(wrapper.find('input[type="tel"]'))).toEqual(paddingClasses(wrapper.find('input[autocomplete="address-line1"]')))
  })
})

describe('account/addresses/[id]/edit region', () => {
  async function pickCountry(wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper'], alpha2: string) {
    await wrapper.find('select[autocomplete="country"]').setValue(alpha2)
    await flushPromises()
  }

  const regionSelect = (wrapper: Awaited<ReturnType<typeof mountPage>>['wrapper']) =>
    wrapper.find<HTMLSelectElement>('select[autocomplete="address-level1"]')

  it('clears the region and loads the regions of the new country when it changes', async () => {
    const { wrapper } = await mountPage()
    expect(regionSelect(wrapper).element.value).toBe('ATTIKI')

    await pickCountry(wrapper, 'CY')

    expect(regionRequests.at(-1)).toBe('CY')
    expect(regionSelect(wrapper).element.value).toBe('')
    // The dropdown's items, as the select is handed them: its hidden
    // native <select> only lists the options it has seen selected.
    const region = wrapper.findAllComponents({ name: 'USelect' }).find(select => select.props('autocomplete') === 'address-level1')!
    await vi.waitFor(() => expect(region.props('items')).toEqual([{ label: 'Λευκωσία', value: 'CY-01' }]))
    // One request per country: the reactive query refetches by itself,
    // and a manual fetch beside it asked twice.
    expect(regionRequests).toEqual(['GR', 'CY'])
  })

  it('requires a region for a country that has them', async () => {
    mockApi.mockReset().mockResolvedValue({})
    const { wrapper } = await mountPage()

    await pickCountry(wrapper, 'CY')
    await wrapper.find('input[autocomplete="postal-code"]').setValue('1010')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    expect(mockApi.mock.calls.filter(([url]) => url === '/api/user/addresses/5')).toEqual([])
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.required'))
  })

  it('saves without a region for a country that has none', async () => {
    mockApi.mockReset().mockResolvedValue({})
    const { wrapper } = await mountPage()

    await pickCountry(wrapper, 'XX')
    await wrapper.find('input[autocomplete="postal-code"]').setValue('1234')
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const call = mockApi.mock.calls.find(([url]) => url === '/api/user/addresses/5')
    expect(call?.[1]).toMatchObject({ method: 'PUT', body: { country: 'XX' } })
    expect(call?.[1]?.body.region ?? '').toBe('')
  })
})
