import { failWith } from '~~/test/helpers/api'
/**
 * Tests for Account/SettingsForm.vue — the profile form.
 *
 * The saved phone is E.164 and is parsed back into the flag picker plus the
 * national digits; it validates against the country picked there (the form's
 * country until then) and is sent as E.164. The country list is the full,
 * unpaginated one (the default page holds only 12 rows), with autofill
 * tokens on the selects. A save goes out as one PUT; its response refreshes
 * the session and, when the language changed, the UI locale. A new username
 * goes through its own request first, and the photo is uploaded or removed
 * by its own PATCH, never by the profile save.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import type { UserDetails } from '~~/shared/openapi/types.gen'
import { makeUserDetails } from '~~/test/fixtures/user'
import SettingsForm from '~/components/Account/SettingsForm.vue'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
// `usePhoneCountries` is a `useApi`, which transports through `$fetch`.
mockNuxtImport('$fetch', () => api)

const mockUser = await vi.hoisted(async () => (await import('vue')).ref({} as UserDetails))
const { fetchSession, setLanguage, toastAdd } = vi.hoisted(() => ({
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
// The media origin is tenant config the test environment does not carry.
mockNuxtImport('useMediaStreamImage', () => () => (src: string) => `https://media.test/${src}`)

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
const CHANGE_USERNAME = `${ACCOUNT}/change-username`

function profile(overrides: Partial<UserDetails> = {}) {
  return makeUserDetails({
    id: 1,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    username: 'tester',
    phone: '+35796123456',
    country: 'GR',
    region: 'ATTIKI',
    languageCode: 'el',
    ...overrides,
  })
}

beforeEach(() => {
  clearNuxtData()
  mockUser.value = profile()
  api.routes({
    '/api/countries': { count: 2, results: [GR, CY] },
    '/api/regions': { count: 1, results: [{ alpha: 'ATTIKI', translations: { el: { name: 'Αττική' } } }] },
    [ACCOUNT]: {},
    [CHANGE_USERNAME]: { detail: 'Username updated successfully.' },
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

/** The control a visible label points at (UFormField wires `for` to the control's id). */
function controlOf(wrapper: VueWrapper, label: string) {
  const labelEl = wrapper.findAll('label').find(el => el.text().startsWith(label))!
  return wrapper.find(`#${labelEl.attributes('for')}`)
}

/** The USelect holding a form field's value. */
const selectNamed = (wrapper: VueWrapper, name: string) =>
  wrapper.findAllComponents({ name: 'USelect' }).find(select => select.props('name') === name)!

const buttonLabelled = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(button => button.text() === label)

async function chooseFile(wrapper: VueWrapper, file: File) {
  const input = wrapper.find('input[type="file"]')
  Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
  await input.trigger('change')
  await flushPromises()
}

const putBody = () => api.callsTo(ACCOUNT).filter(call => call.options.method === 'PUT').at(-1)?.options.body
const avatarCalls = () => api.callsTo(ACCOUNT).filter(call => call.options.method === 'PATCH')

describe('Account/SettingsForm phone flag picker', () => {
  it('parses the saved E.164 into the picker country and the national digits', async () => {
    const wrapper = await mountForm()

    expect(wrapper.find<HTMLInputElement>('input[type="tel"]').element.value).toBe('96123456')
    expect(wrapper.html()).toContain('Κωδικός χώρας τηλεφώνου: Κύπρος (+357)')
  })

  it('follows the profile country while the saved number is that country\'s', async () => {
    mockUser.value = profile({ phone: '+306912345678' })
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
    mockUser.value = profile({ phone: '' })
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

    await selectNamed(wrapper, 'country').setValue('CY')
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
    mockUser.value = profile({ country: null, region: null })
    const wrapper = await mountForm()

    await submit(wrapper)

    expect(api.callsTo('/api/regions')).toEqual([])
    expect(putBody()).toMatchObject({ country: undefined, region: undefined })
  })
})

describe('Account/SettingsForm saving', () => {
  it('PUTs the profile to the signed-in account', async () => {
    mockUser.value = profile({ birthDate: '1990-05-15' })
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

  it('sends every address field the profile keeps', async () => {
    mockUser.value = profile({ city: 'Θεσσαλονίκη', zipcode: '54622', address: 'Τσιμισκή 100', place: 'Κέντρο' })
    const wrapper = await mountForm()

    await controlOf(wrapper, 'Πόλη').setValue('Αθήνα')
    await submit(wrapper)

    expect(putBody()).toMatchObject({ city: 'Αθήνα', zipcode: '54622', address: 'Τσιμισκή 100', place: 'Κέντρο' })
  })

  // `new Date('1990-05-15')` is UTC midnight, the evening of the 14th
  // west of Greenwich: a visitor there saw, and re-saved, the day before.
  // Node re-reads `TZ` when it is assigned, so these run in each zone
  // whatever the machine's own.
  it.each(['America/New_York', 'Pacific/Kiritimati'])('shows and saves the saved birth day unchanged in %s', async (zone) => {
    vi.stubEnv('TZ', zone)
    mockUser.value = profile({ birthDate: '1990-05-15' })
    const wrapper = await mountForm()

    const segment = (name: string) => wrapper.find(`[data-segment="${name}"]`).text()
    expect([segment('day'), segment('month'), segment('year')]).toEqual(['15', '5', '1990'])

    await submit(wrapper)

    expect(putBody()?.birthDate).toBe('1990-05-15')
  })

  it('reports a rejected save once and settles, leaving the form usable', async () => {
    api.routes({ [ACCOUNT]: failWith(400) })
    const wrapper = await mountForm()
    const onSubmit = wrapper.findComponent({ name: 'UForm' }).props('onSubmit')

    // UForm rethrows whatever its submit handler throws, into Vue's
    // error handler: the handler itself must not reject.
    await expect(onSubmit({ data: { languageCode: 'el' } })).resolves.toBeUndefined()

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Σφάλμα', color: 'error' })
    expect(fetchSession).not.toHaveBeenCalled()
    await flushPromises()
    expect(buttonLabelled(wrapper, 'Αποθήκευση αλλαγών')!.attributes('disabled')).toBeUndefined()
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

    await selectNamed(wrapper, 'languageCode').setValue('en')
    await submit(wrapper)

    expect(putBody()?.languageCode).toBe('en')
    expect(setLanguage).toHaveBeenCalledWith('en')
  })

  it('offers every platform language', async () => {
    const wrapper = await mountForm()
    const language = selectNamed(wrapper, 'languageCode')

    expect(language.props('items').map((item: { value: string }) => item.value)).toEqual(['el', 'en'])
    expect(language.props('disabled')).toBe(false)
  })
})

describe('Account/SettingsForm username', () => {
  it('shows the current username', async () => {
    const wrapper = await mountForm()

    expect(controlOf(wrapper, 'Όνομα χρήστη').element).toHaveProperty('value', 'tester')
  })

  it('changes a new username first, then saves the rest of the profile', async () => {
    const wrapper = await mountForm()

    await controlOf(wrapper, 'Όνομα χρήστη').setValue('tester.new')
    await submit(wrapper)

    expect(api.callsTo(CHANGE_USERNAME).map(call => call.options)).toEqual([
      expect.objectContaining({ method: 'POST', body: { username: 'tester.new' } }),
    ])
    expect(putBody()).toMatchObject({ firstName: 'Test', lastName: 'User' })
    expect(api.mock.calls.map(([url]) => url).filter(url => [CHANGE_USERNAME, ACCOUNT].includes(url)))
      .toEqual([CHANGE_USERNAME, ACCOUNT])
  })

  it('reads the session again once the username is saved, even when the profile save then fails', async () => {
    api.routes({ [ACCOUNT]: failWith(500) })
    const wrapper = await mountForm()

    await controlOf(wrapper, 'Όνομα χρήστη').setValue('tester.new')
    await submit(wrapper)

    expect(api.callsTo(CHANGE_USERNAME)).toHaveLength(1)
    expect(fetchSession).toHaveBeenCalledOnce()
  })

  it('leaves the username alone when it was not edited', async () => {
    const wrapper = await mountForm()

    await submit(wrapper)

    expect(api.callsTo(CHANGE_USERNAME)).toEqual([])
    expect(putBody()).not.toHaveProperty('username')
  })

  it('shows the reason a username is refused and saves nothing', async () => {
    api.routes({ [CHANGE_USERNAME]: failWith(409, { detail: 'Username already taken.' }) })
    const wrapper = await mountForm()

    await controlOf(wrapper, 'Όνομα χρήστη').setValue('taken')
    await submit(wrapper)

    expect(toastAdd).toHaveBeenCalledWith({ title: 'Username already taken.', color: 'error' })
    expect(api.callsTo(ACCOUNT)).toEqual([])
    expect(fetchSession).not.toHaveBeenCalled()
  })

  it('refuses a username with spaces before any request', async () => {
    const wrapper = await mountForm()

    await controlOf(wrapper, 'Όνομα χρήστη').setValue('not valid')
    await submit(wrapper)

    expect(wrapper.text()).toContain('Χωρίς κενά· μόνο γράμματα, αριθμοί και σύμβολα.')
    expect(api.callsTo(CHANGE_USERNAME)).toEqual([])
    expect(api.callsTo(ACCOUNT)).toEqual([])
  })
})

describe('Account/SettingsForm photo', () => {
  it('uploads a chosen image as multipart and refreshes the session', async () => {
    const wrapper = await mountForm()
    await chooseFile(wrapper, new File(['x'], 'me.png', { type: 'image/png' }))

    const [call] = avatarCalls()
    expect(avatarCalls()).toHaveLength(1)
    expect(call?.options.body).toBeInstanceOf(FormData)
    expect(call?.options.body.get('image')).toMatchObject({ name: 'me.png', size: 1, type: 'image/png' })
    expect(fetchSession).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η φωτογραφία ενημερώθηκε', color: 'success' })
    // The profile itself is not saved by a photo change.
    expect(putBody()).toBeUndefined()
  })

  it('refuses a file that is not a JPG or PNG without sending it', async () => {
    const wrapper = await mountForm()

    await chooseFile(wrapper, new File(['x'], 'me.gif', { type: 'image/gif' }))

    expect(avatarCalls()).toEqual([])
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Επιτρέπονται μόνο αρχεία JPG και PNG', color: 'error' })
  })

  it('says so when the upload fails, and does not refresh the session', async () => {
    api.routes({ [ACCOUNT]: failWith(413) })
    const wrapper = await mountForm()

    await chooseFile(wrapper, new File(['x'], 'me.jpg', { type: 'image/jpeg' }))

    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η φωτογραφία δεν ενημερώθηκε', color: 'error' })
    expect(fetchSession).not.toHaveBeenCalled()
  })

  it('removes the photo with an empty image, only when there is one', async () => {
    mockUser.value = profile({ mainImagePath: 'media/uploads/users/me.png' })
    const wrapper = await mountForm()

    await buttonLabelled(wrapper, 'Αφαίρεση')!.trigger('click')
    await flushPromises()

    const [call] = avatarCalls()
    expect(avatarCalls()).toHaveLength(1)
    expect(call?.options.body.get('image')).toBe('')
    expect(fetchSession).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η φωτογραφία αφαιρέθηκε', color: 'success' })
  })

  it('offers no remove button while there is no photo', async () => {
    const wrapper = await mountForm()

    expect(buttonLabelled(wrapper, 'Αφαίρεση')).toBeUndefined()
    expect(buttonLabelled(wrapper, 'Ανέβασμα φωτογραφίας')).toBeDefined()
  })
})
