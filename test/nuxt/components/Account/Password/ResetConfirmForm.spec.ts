import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import ResetConfirmForm from '~/components/Account/Password/ResetConfirmForm.vue'
import WebsideResetConfirmForm from '~/components/variants/webside/Account/Password/ResetConfirmForm.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * Setting a new password from the emailed reset link. Mocked at
 * `useAllAuthAuthentication`; the key comes from the real route. The two
 * trees share their `<script>`.
 */
const { getPasswordReset, passwordReset, navigateToMock, toastAdd } = vi.hoisted(() => ({
  getPasswordReset: vi.fn((_key: string) => Promise.resolve({ status: 200 })),
  passwordReset: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  navigateToMock: vi.fn(),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getPasswordReset, passwordReset }))
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const RESET_ROUTE = '/account/password/reset/key/abc-123'

/** allauth answers a successful reset with 401 when it does not sign the user in. */
const RESET_BUT_SIGNED_OUT = { data: { statusCode: 401, data: { status: 401, data: { flows: [] }, meta: { is_authenticated: false } } } }
const TOO_COMMON = { data: { statusCode: 400, data: { status: 400, errors: [{ code: 'password_too_common', param: 'password', message: 'Αυτός ο κωδικός είναι πολύ συνηθισμένος.' }] } } }

beforeEach(() => {
  clearNuxtData('passwordReset')
})

async function type(wrapper: VueWrapper, password: string, confirmation = password) {
  const [first, second] = wrapper.findAll('input[autocomplete="new-password"]')
  await first!.setValue(password)
  await second!.setValue(confirmation)
}

async function submit(wrapper: VueWrapper) {
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe.each(trees(ResetConfirmForm, WebsideResetConfirmForm))('$tree Account/Password/ResetConfirmForm', ({ C }) => {
  const mountForm = (route = RESET_ROUTE) => mountSuspended(C, { route })

  it('checks the key from the link before offering the form', async () => {
    await mountForm()

    expect(getPasswordReset).toHaveBeenCalledWith('abc-123')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('sends a visitor without a key back to request a new link', async () => {
    await mountForm('/')

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-password-reset'))
  })

  it('resets the password with the key, then sends the shopper to sign in', async () => {
    const wrapper = await mountForm()

    await type(wrapper, 'Καλημέρα2024')
    await submit(wrapper)

    expect(passwordReset).toHaveBeenCalledWith({ password: 'Καλημέρα2024', key: 'abc-123' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('passwordReset')).toHaveLength(1)
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe(useLocalePath()('account-login')))
  })

  it.each([
    ['a confirmation that does not match', 'Καλημέρα2024', 'Καλημέρα2025', 'Η επιβεβαίωση κωδικού πρόσβασης πρέπει να ταιριάζει με τον κωδικό πρόσβασης'],
    ['an all-digit password', '12345678', '12345678', null],
    ['a password under 8 characters', 'Ab1', 'Ab1', null],
  ])('refuses %s without asking allauth', async (_case, password, confirmation, message) => {
    const wrapper = await mountForm()
    const { t } = useNuxtApp().$i18n
    const expected = message ?? (password === '12345678'
      ? t('validation.password.entirely_numeric')
      : t('validation.min', { min: 8 }))

    await type(wrapper, password, confirmation)
    await submit(wrapper)

    expect(wrapper.text()).toContain(expected)
    expect(passwordReset).not.toHaveBeenCalled()
  })

  it('treats allauth\'s signed-out 401 as a successful reset', async () => {
    passwordReset.mockRejectedValue(RESET_BUT_SIGNED_OUT)
    const wrapper = await mountForm()

    await type(wrapper, 'Καλημέρα2024')
    await submit(wrapper)

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('account-login'))
    expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(false)
  })

  it('shows each password rule allauth rejected', async () => {
    passwordReset.mockRejectedValue(TOO_COMMON)
    const wrapper = await mountForm()

    await type(wrapper, 'Password123')
    await submit(wrapper)

    expect(toastAdd).toHaveBeenCalledWith({ title: 'Αυτός ο κωδικός είναι πολύ συνηθισμένος.', color: 'error' })
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('explains an expired link when the reset fails outright', async () => {
    passwordReset.mockRejectedValue(new Error('network down'))
    const wrapper = await mountForm()

    await type(wrapper, 'Καλημέρα2024')
    await submit(wrapper)

    expect(wrapper.findComponent({ name: 'UAlert' }).text()).toContain('Ο σύνδεσμος επαναφοράς μπορεί να έχει λήξει ή να είναι άκυρος.')
    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('error.default'), color: 'error' })
  })

  it.each([
    // Unicode classes: «Καλημέρα2024» has an upper-case Greek letter.
    ['Καλημέρα2024', 'Ισχυρός κωδικός'],
    ['καλημέρα2024', 'Μέτριος κωδικός'],
    ['abcdefgh', 'Αδύναμος κωδικός'],
  ])('rates %s as "%s"', async (password, rating) => {
    const wrapper = await mountForm()

    await wrapper.findAll('input[autocomplete="new-password"]')[0]!.setValue(password)

    expect(wrapper.text()).toContain(`${rating}. Πρέπει να περιέχει`)
  })
})
