import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import TwoFactorWebauthn from '~/components/Storefront/Auth/TwoFactorWebauthn.vue'
import WebsideTwoFactorWebauthn from '~/components/variants/webside/Storefront/Auth/TwoFactorWebauthn.vue'
import { asProxiedError, makeBadResponse, makePendingFlowResponse, makeSessionResponse } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * Answering the second-factor challenge of a sign-in with a security key
 * (`useWebAuthnChallenge('authenticate')` and `useAuthEventGuard`, shared
 * by both trees): allauth's request options go to the browser, the
 * credential comes back, the session it answers with is kept. Started by
 * the shopper's click (Safari refuses a WebAuthn request without one). A
 * cancelled prompt or a refused credential shows the page's error and
 * claims no sign-in. Mocked at `useAllAuthAuthentication`; the browser's
 * WebAuthn API is stubbed.
 */
const { getWebAuthnRequestOptionsForAuthentication, authenticateUsingWebAuthn, toastAdd, navigateToMock, credentialsGet } = vi.hoisted(() => ({
  getWebAuthnRequestOptionsForAuthentication: vi.fn(),
  authenticateUsingWebAuthn: vi.fn(),
  toastAdd: vi.fn(),
  navigateToMock: vi.fn(),
  credentialsGet: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getWebAuthnRequestOptionsForAuthentication, authenticateUsingWebAuthn }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('navigateTo', () => navigateToMock)

const REQUEST_OPTIONS = { challenge: 'Y2hhbGxlbmdl', rpId: 'test.local' }
const CREDENTIAL_JSON = { id: 'cred-1', type: 'public-key' }
const SIGNED_IN = makeSessionResponse()

beforeEach(() => {
  useState('authEvent').value = AuthChangeEvent.FLOW_UPDATED
  useState('auth-state').value = makePendingFlowResponse('mfa_authenticate', { types: ['webauthn', 'totp'] })
  useAuthStore().session = undefined
  getWebAuthnRequestOptionsForAuthentication.mockResolvedValue({ status: 200, data: { request_options: { publicKey: REQUEST_OPTIONS } } })
  authenticateUsingWebAuthn.mockResolvedValue(SIGNED_IN)
  credentialsGet.mockResolvedValue({ toJSON: () => CREDENTIAL_JSON })
  vi.stubGlobal('PublicKeyCredential', { parseRequestOptionsFromJSON: (json: unknown) => ({ parsed: json }) })
  // A getter spy on happy-dom's `navigator.credentials`: `restoreMocks`
  // puts the real one back after every test.
  vi.spyOn(window.navigator, 'credentials', 'get').mockReturnValue({ get: credentialsGet } as Partial<CredentialsContainer> as CredentialsContainer)
})

describe.each(trees(TwoFactorWebauthn, WebsideTwoFactorWebauthn))('$tree Storefront/Auth/TwoFactorWebauthn', ({ C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/2fa/authenticate/webauthn' })
  const start = async (wrapper: VueWrapper) => {
    // The page's own button is the last one: the other factors are links.
    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()
  }

  it('asks the browser for the key only when the shopper clicks', async () => {
    await mountPage()

    expect(credentialsGet).not.toHaveBeenCalled()
    expect(getWebAuthnRequestOptionsForAuthentication).not.toHaveBeenCalled()
  })

  it('signs in with the credential the browser returns, keeps the session and tells its parent', async () => {
    const wrapper = await mountPage()

    await start(wrapper)

    expect(credentialsGet).toHaveBeenCalledWith({ publicKey: { parsed: REQUEST_OPTIONS } })
    expect(authenticateUsingWebAuthn).toHaveBeenCalledExactlyOnceWith({ credential: CREDENTIAL_JSON })
    expect(useAuthStore().session).toEqual(SIGNED_IN.data)
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('authenticateUsingWebAuthn')).toHaveLength(1)
    expect(wrapper.findAllComponents({ name: 'UAlert' }).map(alert => alert.props('color'))).not.toContain('error')
  })

  it('shows the error and claims no sign-in when the prompt is cancelled', async () => {
    credentialsGet.mockRejectedValue(new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError'))
    const wrapper = await mountPage()

    await start(wrapper)

    expect(wrapper.findAllComponents({ name: 'UAlert' }).map(alert => alert.props('color'))).toContain('error')
    expect(authenticateUsingWebAuthn).not.toHaveBeenCalled()
    expect(toastAdd).not.toHaveBeenCalled()
    expect(wrapper.emitted('authenticateUsingWebAuthn')).toBeUndefined()
  })

  it('shows the error when allauth refuses the credential', async () => {
    authenticateUsingWebAuthn.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'invalid', param: 'credential', message: 'Refused.' })))
    const wrapper = await mountPage()

    await start(wrapper)

    expect(wrapper.findAllComponents({ name: 'UAlert' }).map(alert => alert.props('color'))).toContain('error')
    expect(useAuthStore().session).toBeUndefined()
    expect(toastAdd).not.toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
  })

  it('sends a visitor whose sign-in is not waiting on a second factor home', async () => {
    useState('authEvent').value = AuthChangeEvent.LOGGED_IN

    await mountPage()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
