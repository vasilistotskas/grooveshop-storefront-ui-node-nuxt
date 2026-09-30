import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import CreatePasskeyForm from '~/components/Account/Signup/CreatePasskeyForm.vue'
import WebsideCreatePasskeyForm from '~/components/variants/webside/Account/Signup/CreatePasskeyForm.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * The second step of a passkey sign-up: create the credential for the
 * pending `mfa_webauthn_signup` flow. A 409, or no such flow pending,
 * means the sign-up has to start over from the email step. Mocked at
 * `useAllAuthAuthentication`; the browser's WebAuthn API is stubbed.
 * The two trees share their `<script>`.
 */
const { getWebAuthnCreateOptionsAtSignup, signupWebAuthnCredential, toastAdd, credentialsCreate } = vi.hoisted(() => ({
  getWebAuthnCreateOptionsAtSignup: vi.fn(),
  signupWebAuthnCredential: vi.fn(),
  toastAdd: vi.fn(),
  credentialsCreate: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getWebAuthnCreateOptionsAtSignup, signupWebAuthnCredential }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const CREATION_OPTIONS = { challenge: 'Y2hhbGxlbmdl', rp: { id: 'test.local' } }
const CREDENTIAL_JSON = { id: 'cred-1', type: 'public-key' }
const pending = (id: string) => ({ status: 401, data: { flows: [{ id, is_pending: true }] }, meta: { is_authenticated: false } })
const allauthError = (status: number) => ({
  data: { statusCode: status, data: { status, errors: [{ code: 'invalid', message: 'Invalid credential.' }] } },
})

beforeEach(() => {
  useState('auth-state').value = pending('mfa_signup_webauthn')
  getWebAuthnCreateOptionsAtSignup.mockResolvedValue({ status: 200, data: { request_options: { publicKey: CREATION_OPTIONS } } })
  signupWebAuthnCredential.mockResolvedValue({ status: 200 })
  credentialsCreate.mockResolvedValue({ toJSON: () => CREDENTIAL_JSON })
  vi.stubGlobal('PublicKeyCredential', { parseCreationOptionsFromJSON: (json: unknown) => ({ parsed: json }) })
  // A getter spy on happy-dom's `navigator.credentials`: `restoreMocks`
  // puts the real one back after every test.
  vi.spyOn(window.navigator, 'credentials', 'get').mockReturnValue({ create: credentialsCreate } as Partial<CredentialsContainer> as CredentialsContainer)
})

/** The form's error alert (the page also carries an info alert with a hint). */
const errorAlert = (wrapper: VueWrapper) =>
  wrapper.findAllComponents({ name: 'UAlert' }).find(alert => alert.props('color') === 'error')

async function submit(wrapper: VueWrapper, name: string) {
  await wrapper.find('input').setValue(name)
  await wrapper.find('form').trigger('submit')
  await flushPromises()
}

describe.each(trees(CreatePasskeyForm, WebsideCreatePasskeyForm))('$tree Account/Signup/CreatePasskeyForm', ({ C }) => {
  const mountForm = () => mountSuspended(C, { route: '/account/signup/passkey/create' })

  it('creates the passkey for allauth\'s challenge under the name given', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, 'Laptop')

    expect(credentialsCreate).toHaveBeenCalledWith({ publicKey: { parsed: CREATION_OPTIONS } })
    expect(signupWebAuthnCredential).toHaveBeenCalledWith({ name: 'Laptop', credential: CREDENTIAL_JSON })
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('signupWebAuthnCredential')).toHaveLength(1)
  })

  it('asks for a name first', async () => {
    const wrapper = await mountForm()

    await submit(wrapper, '')

    expect(getWebAuthnCreateOptionsAtSignup).not.toHaveBeenCalled()
    // The component's own `validation.required`, not the global one.
    expect(wrapper.text()).toContain('Απαιτείται όνομα')
  })

  it.each([
    ['allauth answers 409', () => signupWebAuthnCredential.mockRejectedValue(allauthError(409))],
    ['the sign-up flow is no longer pending', () => {
      useState('auth-state').value = pending('login')
      signupWebAuthnCredential.mockRejectedValue(allauthError(400))
    }],
  ])('starts the sign-up over when %s', async (_case, arrange) => {
    arrange()
    const wrapper = await mountForm()

    await submit(wrapper, 'Laptop')

    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe(useLocalePath()('account-signup-passkey')))
    expect(errorAlert(wrapper)).toBeUndefined()
  })

  it.each([
    ['allauth rejects the credential mid-flow', () => signupWebAuthnCredential.mockRejectedValue(allauthError(400))],
    ['the browser prompt is dismissed', () => credentialsCreate.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'))],
  ])('shows the error and stays when %s', async (_case, arrange) => {
    arrange()
    const wrapper = await mountForm()

    await submit(wrapper, 'Laptop')

    expect(errorAlert(wrapper)).toBeDefined()
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(useRouter().currentRoute.value.path).toBe('/account/signup/passkey/create')
  })
})
