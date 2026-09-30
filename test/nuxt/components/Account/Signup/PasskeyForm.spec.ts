import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import PasskeyForm from '~/components/Account/Signup/PasskeyForm.vue'
import WebsidePasskeyForm from '~/components/variants/webside/Account/Signup/PasskeyForm.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The first step of a passkey sign-up: the email allauth starts the
 * `mfa_webauthn_signup` flow for. Mocked at `useAllAuthAuthentication`.
 * The two trees share their `<script>`.
 */
const { signUpByPasskey, toastAdd } = vi.hoisted(() => ({
  signUpByPasskey: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ signUpByPasskey }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const EMAIL_TAKEN = {
  data: { statusCode: 400, data: { status: 400, errors: [{ code: 'email_taken', param: 'email', message: 'A user is already registered with this email address.' }] } },
}

beforeEach(() => {
  signUpByPasskey.mockResolvedValue({ status: 200 })
})

async function submit(wrapper: VueWrapper, email: string) {
  await wrapper.find('input[name="email"]').setValue(email)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe.each(trees(PasskeyForm, WebsidePasskeyForm))('$tree Account/Signup/PasskeyForm', ({ C }) => {
  const mountForm = () => mountSuspended(C, { route: false })

  it('starts the passkey sign-up for the email given', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'new@example.com')

    expect(signUpByPasskey).toHaveBeenCalledWith({ email: 'new@example.com' })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('signUpByPasskey')).toHaveLength(1)
  })

  it('refuses an address that is not an email', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'not-an-email')

    expect(signUpByPasskey).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.email.valid'))
  })

  it('shows the error and what allauth objected to', async () => {
    signUpByPasskey.mockRejectedValue(EMAIL_TAKEN)
    const wrapper = await mountForm()

    await submit(wrapper, 'taken@example.com')

    expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(true)
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(wrapper.emitted('signUpByPasskey')).toBeUndefined()
  })
})
