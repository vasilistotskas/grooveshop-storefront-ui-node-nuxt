import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import LoginButton from '~/components/WebAuthn/LoginButton.vue'
import WebsideLoginButton from '~/components/variants/webside/WebAuthn/LoginButton.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * Passkey sign-in: request options from allauth, ask the browser for a
 * credential, hand it back. Mocked at `useAllAuthAuthentication`; the
 * browser's WebAuthn API (`PublicKeyCredential`, `navigator.credentials`,
 * absent from happy-dom) is stubbed. The two trees share their `<script>`.
 */
const { getWebAuthnRequestOptionsForLogin, loginUsingWebAuthn, clearSession, toastAdd, credentialsGet } = vi.hoisted(() => ({
  getWebAuthnRequestOptionsForLogin: vi.fn(),
  loginUsingWebAuthn: vi.fn(),
  clearSession: vi.fn(() => Promise.resolve()),
  toastAdd: vi.fn(),
  credentialsGet: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getWebAuthnRequestOptionsForLogin, loginUsingWebAuthn }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: clearSession,
}))

const REQUEST_OPTIONS = { challenge: 'Y2hhbGxlbmdl', rpId: 'test.local' }
const CREDENTIAL_JSON = { id: 'cred-1', type: 'public-key' }
const SIGNED_IN = { status: 200, data: { user: { id: 7 }, methods: [] }, meta: { is_authenticated: true } }

let refreshCart: MockInstance<() => Promise<void>>

beforeEach(() => {
  getWebAuthnRequestOptionsForLogin.mockResolvedValue({ status: 200, data: { request_options: { publicKey: REQUEST_OPTIONS } } })
  loginUsingWebAuthn.mockResolvedValue(SIGNED_IN)
  credentialsGet.mockResolvedValue({ toJSON: () => CREDENTIAL_JSON })
  vi.stubGlobal('PublicKeyCredential', { parseRequestOptionsFromJSON: (json: unknown) => ({ parsed: json }) })
  // A getter spy on happy-dom's `navigator.credentials`: `restoreMocks`
  // puts the real one back after every test.
  vi.spyOn(window.navigator, 'credentials', 'get').mockReturnValue({ get: credentialsGet } as Partial<CredentialsContainer> as CredentialsContainer)
  refreshCart = vi.spyOn(useCartStore(), 'refreshCart').mockResolvedValue()
  useAuthStore().session = undefined
})

async function press(wrapper: VueWrapper) {
  await wrapper.find('button').trigger('click')
  await vi.waitFor(() => expect(wrapper.emitted('loginUsingWebAuthn')).toBeTruthy())
}

describe.each(trees(LoginButton, WebsideLoginButton))('$tree WebAuthn/LoginButton', ({ C }) => {
  const mountButton = () => mountSuspended(C, { route: '/?next=/account' })

  it('signs in with the credential the browser returns for allauth\'s challenge', async () => {
    const wrapper = await mountButton()

    await press(wrapper)

    expect(clearSession).toHaveBeenCalledTimes(1)
    expect(credentialsGet).toHaveBeenCalledWith({ publicKey: { parsed: REQUEST_OPTIONS } })
    expect(loginUsingWebAuthn).toHaveBeenCalledWith({ credential: CREDENTIAL_JSON })
    expect(useAuthStore().session).toEqual(SIGNED_IN.data)
    expect(refreshCart).toHaveBeenCalledTimes(1)
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it.each([
    ['allauth sends no challenge', () => getWebAuthnRequestOptionsForLogin.mockResolvedValue({ status: 200, data: { request_options: {} } })],
    ['the shopper dismisses the browser prompt', () => credentialsGet.mockRejectedValue(new DOMException('cancelled', 'NotAllowedError'))],
    ['allauth rejects the credential', () => loginUsingWebAuthn.mockRejectedValue(new Error('400'))],
  ])('says the passkey sign-in failed when %s', async (_case, arrange) => {
    arrange()
    const wrapper = await mountButton()

    await press(wrapper)

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'error' }))
    expect(useAuthStore().session).toBeUndefined()
    expect(refreshCart).not.toHaveBeenCalled()
    expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
  })

  it('is busy while the browser prompt is open', async () => {
    credentialsGet.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountButton()

    await wrapper.find('button').trigger('click')
    await flushPromises()

    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    expect(loginUsingWebAuthn).not.toHaveBeenCalled()
  })
})
