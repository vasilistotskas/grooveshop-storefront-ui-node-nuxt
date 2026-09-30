import { failWith } from '~~/test/helpers/api'
/**
 * Tests for Account/SettingsForm.vue — the profile form.
 *
 * The saved phone is E.164 and is parsed back into the flag picker plus the
 * national digits; it validates against the country picked there (the form's
 * country until then) and is sent as E.164. The country list is the full,
 * unpaginated one (the default page holds only 12 rows), with autofill
 * tokens on the selects. A save goes out as one PUT; its response refreshes
 * the session and, when the language changed, the UI locale.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import SettingsForm from '~/components/Account/SettingsForm.vue'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
// `usePhoneCountries` is a `useApi`, which transports through `$fetch`.
mockNuxtImport('$fetch', () => api)

const { mockUser, fetchSession, setLanguage, toastAdd } = vi.hoisted(() => ({
  mockUser: { value: {} as Record<string, unknown> },
  fetchSession: vi.fn(() => Promise.resolve()),
  setLanguage: vi.fn((_code: string) => Promise.resolve(true)),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useUserSession', () => () => ({
  user: mockUser,
  fetch: fetchSession,
  loggedIn: ref(true),
  session: ref({}),
  clear: () => Promise.resolve(),
  ready: ref(true),
}))
mockNuxtImport('useUserLanguage', () => () => ({ setLanguage }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

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

const ACCOUNT = '/api/user/account/1'

/** Answers the PUT like ofetch does for a 2xx: `onResponse` runs before the promise settles. */
async function savedOk(_url: string, options: any) {
  await options.onResponse?.({ response: { ok: true } })
  return {}
}

beforeEach(() => {
  clearNuxtData()
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
  api.routes({
    '/api/countries': { count: 2, results: [GR, CY] },
    '/api/regions': { count: 1, results: [{ alpha: 'ATTIKI', translations: { el: { name: 'Αττική' } } }] },
    [ACCOUNT]: savedOk,
  })
})

async function mountForm() {
  const wrapper = await mountSuspended(SettingsForm, { route: false })
  await flushPromises()
  return wrapper
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

const putBody = () => api.callsTo(ACCOUNT).at(-1)?.options.body

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
    await submit(wrapper)

    expect(putBody()?.phone).toBe('+306912345678')
  })

  it('validates against the picked phone country, not the profile country', async () => {
    // +357 was picked from the saved number, though the profile country is
    // GR — so ten Greek-mobile digits are not a Cypriot number.
    const wrapper = await mountForm()

    await wrapper.find('input[type="tel"]').setValue('6912345678')
    await flushPromises()
    await submit(wrapper)

    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.phone.invalid'))
    expect(api.callsTo(ACCOUNT)).toEqual([])
  })

  it('saves an empty phone: it is optional', async () => {
    mockUser.value.phone = ''
    const wrapper = await mountForm()

    await submit(wrapper)

    expect(putBody()?.phone).toBe('')
  })
})

describe('Account/SettingsForm countries and regions', () => {
  it('lists every country from the unpaginated list, not one 12-row page', async () => {
    await mountForm()

    const [request] = api.callsTo('/api/countries')
    expect(request?.options.query).toEqual({ hasPhoneCode: true, pagination: 'false' })
  })

  it('puts autocomplete="country" and "address-level1" on the selects', async () => {
    const wrapper = await mountForm()

    expect(wrapper.find('select[autocomplete="country"]').exists()).toBe(true)
    expect(wrapper.find('select[autocomplete="address-level1"]').exists()).toBe(true)
  })

  it('loads the regions of the saved country', async () => {
    await mountForm()

    expect(api.callsTo('/api/regions').map(call => call.options.query)).toEqual([
      { country: 'GR', languageCode: 'el' },
    ])
  })

  it('reloads the regions and clears the region when the country changes', async () => {
    const wrapper = await mountForm()

    await wrapper.findAllComponents({ name: 'USelect' })[0]!.setValue('CY')
    await flushPromises()

    expect(api.callsTo('/api/regions').at(-1)?.options.query).toEqual({ country: 'CY', languageCode: 'el' })
    expect(wrapper.find<HTMLSelectElement>('select[autocomplete="address-level1"]').element.value).toBe('choose')
  })

  it('says so when the regions cannot be loaded', async () => {
    api.routes({
      '/api/countries': { count: 2, results: [GR, CY] },
      '/api/regions': failWith(502),
    })

    await mountForm()

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('error.default'),
      color: 'error',
    }))
  })

  it('sends no country or region while either is still the placeholder', async () => {
    mockUser.value.country = null
    mockUser.value.region = null
    const wrapper = await mountForm()

    await submit(wrapper)

    expect(api.callsTo('/api/regions')).toEqual([])
    expect(putBody()).toMatchObject({ country: undefined, region: undefined })
  })
})

describe('Account/SettingsForm saving', () => {
  it('PUTs the profile to the signed-in account', async () => {
    mockUser.value.birthDate = '1990-05-15'
    const wrapper = await mountForm()

    await submit(wrapper)

    expect(api.callsTo(ACCOUNT)).toEqual([{
      url: ACCOUNT,
      options: expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          country: 'GR',
          region: 'ATTIKI',
          // The picked calendar day, never shifted through UTC.
          birthDate: '1990-05-15',
          languageCode: 'el',
        }),
      }),
    }])
  })

  it('sends a null birth date when none is set', async () => {
    const wrapper = await mountForm()

    await submit(wrapper)

    expect(putBody()?.birthDate).toBeNull()
  })

  it('refreshes the session and confirms once the save is accepted', async () => {
    const wrapper = await mountForm()

    await submit(wrapper)

    expect(fetchSession).toHaveBeenCalledTimes(1)
    expect(setLanguage).not.toHaveBeenCalled()
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Τα στοιχεία αποθηκεύτηκαν επιτυχώς', color: 'success' })
  })

  it('switches the UI to the language just saved', async () => {
    const wrapper = await mountForm()

    await wrapper.findAllComponents({ name: 'USelect' })[2]!.setValue('en')
    await submit(wrapper)

    expect(putBody()?.languageCode).toBe('en')
    expect(setLanguage).toHaveBeenCalledWith('en')
  })

  it('offers every platform language', async () => {
    const wrapper = await mountForm()
    const language = wrapper.findAllComponents({ name: 'USelect' })[2]!

    expect(language.props('items').map((item: { value: string }) => item.value)).toEqual(['el', 'en'])
    expect(language.props('disabled')).toBe(false)
  })
})
