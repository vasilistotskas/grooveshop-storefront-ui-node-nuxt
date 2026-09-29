/**
 * Tests for the "edit address" page (app/pages/account/addresses/[id]/edit.vue).
 *
 * The saved phone is E.164 and is parsed back into the flag picker plus the
 * national digits; the form validates and submits E.164 against the country
 * picked in the phone field; the country comes before the street with
 * autofill tokens on the selects.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import EditAddressPage from '~/pages/account/addresses/[id]/edit.vue'

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

let savedPhone = '+35796123456'

beforeEach(() => {
  clearNuxtData()
  savedPhone = '+35796123456'
  registerEndpoint('/api/countries', () => ({ count: 2, next: null, previous: null, results: [GR, CY] }))
  registerEndpoint('/api/regions', () => ({
    count: 1,
    next: null,
    previous: null,
    results: [{ alpha: 'ATTIKI', translations: { el: { name: 'Αττική' } } }],
  }))
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
    const { wrapper } = await mountPage()
    const vm = wrapper.vm as unknown as { schema: { safeParse: (data: unknown) => { error?: { issues: Array<{ path: unknown[], message: string }> } } } }
    const address = { title: 'Home', firstName: 'Test', lastName: 'User', street: 'Main St', streetNumber: '1', city: 'Athens', zipcode: '1010', country: 'CY', region: 'ATTIKI', isMain: false }

    // The +357 pick from the saved number: a 10-digit Greek mobile is wrong for it.
    const invalid = vm.schema.safeParse({ ...address, phone: '+3576912345678' })
    const issue = invalid.error?.issues.find(item => item.path[0] === 'phone')
    expect(issue?.message).toContain('96123456')
    expect(vm.schema.safeParse({ ...address, phone: '+35796123456' }).error?.issues.some(item => item.path[0] === 'phone') ?? false).toBe(false)
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
