import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import PasskeyForm from '~/components/Account/Signup/PasskeyForm.vue'
import WebsidePasskeyForm from '~/components/variants/webside/Account/Signup/PasskeyForm.vue'
import { trees } from '~~/test/helpers/trees'
import { asProxiedError, makePendingFlowResponse } from '~~/test/fixtures/allauth'

/**
 * The first step of a passkey sign-up: the email allauth starts the
 * `mfa_webauthn_signup` flow for. Mocked at `useAllAuthAuthentication`.
 * The two trees share the request; the default no longer toasts a
 * "passkey created" it has not created, and moves on when allauth
 * answers with the next step pending.
 */
const { signUpByPasskey, toastAdd, navigateToMock } = vi.hoisted(() => ({
  signUpByPasskey: vi.fn((_body: unknown) => Promise.resolve({ status: 200 })),
  toastAdd: vi.fn(),
  navigateToMock: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ signUpByPasskey }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('navigateTo', () => navigateToMock)

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

describe.each(trees(PasskeyForm, WebsidePasskeyForm))('$tree Account/Signup/PasskeyForm', ({ tree, C }) => {
  const mountForm = () => mountSuspended(C, { route: false })

  it('starts the passkey sign-up for the email given', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'new@example.com')

    expect(signUpByPasskey).toHaveBeenCalledWith({ email: 'new@example.com' })
    expect(wrapper.emitted('signUpByPasskey')).toHaveLength(1)
  })

  it.runIf(tree === 'webside')('toasts a success once allauth answers', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'new@example.com')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it.runIf(tree === 'default')('claims no passkey before one is made', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'new@example.com')

    expect(signUpByPasskey).toHaveBeenCalled()
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it.runIf(tree === 'default')('moves on to creating the passkey when allauth asks for it', async () => {
    signUpByPasskey.mockRejectedValue(asProxiedError(makePendingFlowResponse('mfa_signup_webauthn')))
    const wrapper = await mountForm()

    await submit(wrapper, 'new@example.com')

    expect(navigateToMock).toHaveBeenCalledWith(expect.objectContaining({
      path: useLocalePath()('account-signup-passkey-create'),
    }))
    expect(wrapper.findComponent({ name: 'UAlert' }).exists()).toBe(false)
    expect(toastAdd).not.toHaveBeenCalled()
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
