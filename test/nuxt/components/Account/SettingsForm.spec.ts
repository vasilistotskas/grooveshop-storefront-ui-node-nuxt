/**
 * Tests for Account/SettingsForm.vue — the profile's phone and country.
 *
 * The saved phone is E.164 and is parsed back into the flag picker plus the
 * national digits; it validates against the country picked there (the form's
 * country until then) and is sent as E.164. The country list is the full,
 * unpaginated one (the default page holds only 12 rows), with autofill
 * tokens on the selects.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { getQuery } from 'h3'
import SettingsForm from '~/components/Account/SettingsForm.vue'

const { mockApi, mockUser } = vi.hoisted(() => ({ mockApi: vi.fn(), mockUser: { value: null as any } }))
mockNuxtImport('$api', () => mockApi)
mockNuxtImport('useUserSession', () => () => ({
  user: mockUser,
  fetch: vi.fn().mockResolvedValue(undefined),
  loggedIn: ref(true),
  session: ref({}),
  clear: vi.fn(),
  ready: ref(true),
}))

function country(alpha2: string, phoneCode: number, el: string, exampleMobile: string, pattern: string, lengths: number[]) {
  return {
    alpha2,
    phoneCode,
    translations: { el: { name: el } },
    hasRegions: true,
    phoneMetadata: { nationalNumberPattern: pattern, possibleLengths: lengths, nationalPrefixForParsing: null, exampleMobile },
  }
}
const GR = country('GR', 30, 'Ελλάδα', '6912345678', '(?:[269]\\d|70)\\d{8}', [10])
const CY = country('CY', 357, 'Κύπρος', '96123456', '(?:[279]\\d|[58]0)\\d{6}', [8])

let countryQueries: Array<Record<string, unknown>> = []

beforeEach(() => {
  clearNuxtData()
  countryQueries = []
  mockApi.mockReset().mockResolvedValue({ count: 0, results: [] })
  mockUser.value = {
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+35796123456',
    country: 'GR',
    region: 'ATTIKI',
    languageCode: 'el',
  }
  registerEndpoint('/api/countries', (event) => {
    countryQueries.push(getQuery(event))
    return { count: 2, results: [GR, CY] }
  })
})

async function mountForm() {
  const wrapper = await mountSuspended(SettingsForm)
  await flushPromises()
  return wrapper
}

describe('Account/SettingsForm phone flag picker', () => {
  it('parses the saved E.164 into the picker country and the national digits', async () => {
    const wrapper = await mountForm()

    expect(wrapper.find<HTMLInputElement>('input[type="tel"]').element.value).toBe('96123456')
    expect(wrapper.html()).toContain('Κωδικός χώρας τηλεφώνου: Κύπρος (+357)')
  })

  it('follows the profile country while the saved number is that country\'s', async () => {
    mockUser.value.phone = '+306912345678'
    const wrapper = await mountForm()

    expect(wrapper.find<HTMLInputElement>('input[type="tel"]').element.value).toBe('6912345678')
    expect(wrapper.html()).toContain('Κωδικός χώρας τηλεφώνου: Ελλάδα (+30)')
  })

  it('submits the E.164 the field built', async () => {
    const wrapper = await mountForm()

    await wrapper.find('input[type="tel"]').setValue('+30 6912345678')
    await flushPromises()
    await wrapper.find('form').trigger('submit')
    await flushPromises()

    const call = mockApi.mock.calls.find(([url]) => url === '/api/user/account/1')
    expect(call?.[1]?.body.phone).toBe('+306912345678')
  })

  it('validates against the picked phone country, not the profile country', async () => {
    const wrapper = await mountForm()
    const vm = wrapper.vm as unknown as { schema: { safeParse: (data: unknown) => { error?: { issues: Array<{ path: unknown[] }> } } } }
    const profile = { email: 'test@example.com', firstName: 'Test', lastName: 'User', city: 'x', zipcode: 'x', address: 'x' }

    // +357 was picked from the saved number, though the profile country is GR.
    const phoneIssue = (phone: string) => vm.schema.safeParse({ ...profile, phone }).error?.issues.some(issue => issue.path[0] === 'phone') ?? false
    expect(phoneIssue('+35796123456')).toBe(false)
    expect(phoneIssue('+3576912345678')).toBe(true)
    expect(phoneIssue('')).toBe(false)
  })
})

describe('Account/SettingsForm countries', () => {
  it('lists every country from the unpaginated list, not one 12-row page', async () => {
    await mountForm()

    const query = countryQueries.find(item => item.pagination === 'false')
    expect(query).toBeDefined()
    expect(query).not.toHaveProperty('shippable')
  })

  it('puts autocomplete="country" and "address-level1" on the selects', async () => {
    const wrapper = await mountForm()

    expect(wrapper.find('select[autocomplete="country"]').exists()).toBe(true)
    expect(wrapper.find('select[autocomplete="address-level1"]').exists()).toBe(true)
  })
})
