import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import TwoFactorReauthenticateWebauthn from '~/components/Storefront/Auth/TwoFactorReauthenticateWebauthn.vue'
import WebsideTwoFactorReauthenticateWebauthn from '~/components/variants/webside/Storefront/Auth/TwoFactorReauthenticateWebauthn.vue'
import { asProxiedError, makeBadResponse, makeSessionResponse } from '~~/test/fixtures/allauth'
import { trees } from '~~/test/helpers/trees'

/**
 * Confirming a security change with a security key
 * (`useWebAuthnChallenge('reauthenticate')` and `useAuthEventGuard`, shared
 * by both trees): allauth's request options go to the browser, the
 * credential comes back, the session it answers with is kept. Started by
 * the shopper's click. A cancelled prompt or a refused credential shows the
 * page's error and claims nothing. Mocked at `useAllAuthAuthentication`;
 * the browser's WebAuthn API is stubbed.
 */
const { getWebAuthnRequestOptionsForReauthentication, reauthenticateUsingWebAuthn, toastAdd, navigateToMock, credentialsGet } = vi.hoisted(() => ({
  getWebAuthnRequestOptionsForReauthentication: vi.fn(),
  reauthenticateUsingWebAuthn: vi.fn(),
  toastAdd: vi.fn(),
  navigateToMock: vi.fn(),
  credentialsGet: vi.fn(),
}))
mockNuxtImport('useAllAuthAuthentication', () => () => ({ getWebAuthnRequestOptionsForReauthentication, reauthenticateUsingWebAuthn }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('navigateTo', () => navigateToMock)

const REQUEST_OPTIONS = { challenge: 'Y2hhbGxlbmdl', rpId: 'test.local' }
const CREDENTIAL_JSON = { id: 'cred-1', type: 'public-key' }
const SIGNED_IN = makeSessionResponse()

beforeEach(() => {
  useState('authEvent').value = AuthChangeEvent.REAUTHENTICATION_REQUIRED
  useAuthStore().session = undefined
  getWebAuthnRequestOptionsForReauthentication.mockResolvedValue({ status: 200, data: { request_options: { publicKey: REQUEST_OPTIONS } } })
  reauthenticateUsingWebAuthn.mockResolvedValue(SIGNED_IN)
  credentialsGet.mockResolvedValue({ toJSON: () => CREDENTIAL_JSON })
  vi.stubGlobal('PublicKeyCredential', { parseRequestOptionsFromJSON: (json: unknown) => ({ parsed: json }) })
  // A getter spy on happy-dom's `navigator.credentials`: `restoreMocks`
  // puts the real one back after every test.
  vi.spyOn(window.navigator, 'credentials', 'get').mockReturnValue({ get: credentialsGet } as Partial<CredentialsContainer> as CredentialsContainer)
})

describe.each(trees(TwoFactorReauthenticateWebauthn, WebsideTwoFactorReauthenticateWebauthn))('$tree Storefront/Auth/TwoFactorReauthenticateWebauthn', ({ C }) => {
  const mountPage = () => mountSuspended(C, { route: '/account/2fa/reauthenticate/webauthn' })
  const start = async (wrapper: VueWrapper) => {
    await wrapper.findAll('button').at(-1)!.trigger('click')
    await flushPromises()
  }

  it('asks the browser for the key only when the shopper clicks', async () => {
    await mountPage()

    expect(credentialsGet).not.toHaveBeenCalled()
  })

  it('confirms with the credential the browser returns, keeps the session and tells its parent', async () => {
    const wrapper = await mountPage()

    await start(wrapper)

    expect(credentialsGet).toHaveBeenCalledWith({ publicKey: { parsed: REQUEST_OPTIONS } })
    expect(reauthenticateUsingWebAuthn).toHaveBeenCalledExactlyOnceWith({ credential: CREDENTIAL_JSON })
    expect(useAuthStore().session).toEqual(SIGNED_IN.data)
    expect(toastAdd).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.emitted('reauthenticateUsingWebAuthn')).toHaveLength(1)
  })

  it('shows the error and claims nothing when the prompt is cancelled', async () => {
    credentialsGet.mockRejectedValue(new DOMException('The operation either timed out or was not allowed.', 'NotAllowedError'))
    const wrapper = await mountPage()

    await start(wrapper)

    expect(wrapper.findAllComponents({ name: 'UAlert' }).map(alert => alert.props('color'))).toContain('error')
    expect(reauthenticateUsingWebAuthn).not.toHaveBeenCalled()
    expect(toastAdd).not.toHaveBeenCalled()
    expect(wrapper.emitted('reauthenticateUsingWebAuthn')).toBeUndefined()
  })

  it('shows the error when allauth refuses the credential', async () => {
    reauthenticateUsingWebAuthn.mockRejectedValue(asProxiedError(makeBadResponse({ code: 'invalid', param: 'credential', message: 'Refused.' })))
    const wrapper = await mountPage()

    await start(wrapper)

    expect(wrapper.findAllComponents({ name: 'UAlert' }).map(alert => alert.props('color'))).toContain('error')
    expect(useAuthStore().session).toBeUndefined()
    expect(toastAdd).not.toHaveBeenCalled()
  })

  it('sends a visitor nobody asked to re-authenticate home', async () => {
    useState('authEvent').value = AuthChangeEvent.LOGGED_IN

    await mountPage()

    expect(navigateToMock).toHaveBeenCalledWith(useLocalePath()('index'))
  })
})
