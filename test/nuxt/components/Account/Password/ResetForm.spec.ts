import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import PasswordResetForm from '~/components/Account/Password/ResetForm.vue'
import WebsidePasswordResetForm from '~/components/variants/webside/Account/Password/ResetForm.vue'
import { trees } from '~~/test/helpers/trees'
import { asProxiedError, makeBadResponse } from '~~/test/fixtures/allauth'

/**
 * Asking allauth to email a password-reset link. Mocked at
 * `useAllAuthAuthentication`; the error toasts are the app's real
 * `handleAllAuthClientError`. The two trees share their `<script>`.
 */
const { passwordRequest, toastAdd } = vi.hoisted(() => ({
  passwordRequest: vi.fn((_body: { email: string }) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ passwordRequest }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const REFUSED = asProxiedError(makeBadResponse({ code: 'invalid', param: 'email', message: 'Εισαγάγετε μια έγκυρη διεύθυνση email.' }))

const RATE_LIMITED = { statusCode: 429, data: { statusCode: 429, data: { status: 429 } } }

/** The component's own `<i18n>` copy (el) — the strings this form owns. */
const COPY = {
  successDescription: 'Ελέγξτε το email σας για οδηγίες επαναφοράς.',
  errorTitle: 'Σφάλμα αποστολής',
}

beforeEach(() => {
  passwordRequest.mockResolvedValue({ status: 200 })
})

/** Type `email` (none: leave the field untouched) and submit. */
async function submitEmail(wrapper: VueWrapper, email: string | null = 'shopper@example.com') {
  if (email !== null) await wrapper.find('input[type="email"]').setValue(email)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe.each(trees(PasswordResetForm, WebsidePasswordResetForm))('$tree Account/Password/ResetForm', ({ C }) => {
  const mountForm = () => mountSuspended(C, { route: false })

  it('asks allauth to email a reset link to the address typed, then says so', async () => {
    const wrapper = await mountForm()

    await submitEmail(wrapper)

    expect(passwordRequest).toHaveBeenCalledWith({ email: 'shopper@example.com' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      title: useNuxtApp().$i18n.t('password.reset.request.success'),
      description: COPY.successDescription,
      color: 'success',
    }))
    expect(wrapper.emitted('passwordRequest')).toHaveLength(1)
    expect(wrapper.text()).not.toContain(COPY.errorTitle)
  })

  it('shows the error and allauth\'s own message when it refuses the request', async () => {
    passwordRequest.mockRejectedValue(REFUSED)
    const wrapper = await mountForm()

    await submitEmail(wrapper)

    expect(wrapper.text()).toContain(COPY.errorTitle)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Εισαγάγετε μια έγκυρη διεύθυνση email.', color: 'error' })
    expect(wrapper.emitted('passwordRequest')).toBeUndefined()
  })

  it('warns about too many requests', async () => {
    passwordRequest.mockRejectedValue(RATE_LIMITED)
    const wrapper = await mountForm()

    await submitEmail(wrapper)

    expect(toastAdd).toHaveBeenCalledWith({ title: useNuxtApp().$i18n.t('error.rate_limited'), color: 'warning' })
    expect(wrapper.text()).toContain(COPY.errorTitle)
  })

  it('clears an earlier failure when the next request succeeds', async () => {
    passwordRequest.mockRejectedValueOnce(REFUSED)
    const wrapper = await mountForm()

    await submitEmail(wrapper)
    expect(wrapper.text()).toContain(COPY.errorTitle)

    await submitEmail(wrapper)
    expect(wrapper.text()).not.toContain(COPY.errorTitle)
    expect(wrapper.emitted('passwordRequest')).toHaveLength(1)
  })

  it.each([
    ['no address', null, 'validation.required'],
    ['an invalid address', 'not-an-email', 'validation.email.valid'],
  ])('does not ask allauth with %s', async (_case, email, key) => {
    const wrapper = await mountForm()

    await submitEmail(wrapper, email)

    expect(passwordRequest).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t(key))
  })

  it('shows the submit button busy until allauth answers', async () => {
    let settle!: (value: { status: number }) => void
    passwordRequest.mockReturnValue(new Promise((resolve) => {
      settle = resolve
    }))
    const wrapper = await mountForm()
    const submit = () => wrapper.find('button[type="submit"]')

    await submitEmail(wrapper)
    expect(submit().attributes('disabled')).toBeDefined()

    settle({ status: 200 })
    await flushPromises()
    expect(submit().attributes('disabled')).toBeUndefined()
  })

  it('links back to sign in', async () => {
    const wrapper = await mountForm()

    expect(wrapper.find(`a[href="${useLocalePath()('account-login')}"]`).exists()).toBe(true)
  })
})
