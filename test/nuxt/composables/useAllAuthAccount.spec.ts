import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const { hooks } = vi.hoisted(() => ({
  hooks: {
    onResponse: vi.fn((..._args: unknown[]) => Promise.resolve()),
    onResponseError: vi.fn((..._args: unknown[]) => Promise.resolve()),
  },
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('onAllAuthResponse', () => hooks.onResponse)
mockNuxtImport('onAllAuthResponseError', () => hooks.onResponseError)

const ACCOUNT = '/api/_allauth/app/v1/account'
const OK = { ok: true, status: 200, _data: { status: 200, data: [] } }
const REAUTH = { ok: false, status: 401, _data: { data: { status: 401, meta: { is_authenticated: true } } } }

const credential = { type: 'public-key', id: 'credential-id', rawId: 'raw-id', response: {} }

type Account = ReturnType<typeof useAllAuthAccount>

describe('useAllAuthAccount', () => {
  beforeEach(() => {
    // ofetch's part: `onResponse` for the response, `onResponseError`
    // after it for a failure — so a spec sees what each wrapper forwards.
    api.mockImplementation(async (_url, options) => {
      await options?.onResponse?.({ response: OK })
      await options?.onResponseError?.({ response: REAUTH })
      return REAUTH._data
    })
  })

  /**
   * Every allauth account endpoint's answers go through the auth pipeline:
   * a 401 here is allauth asking for reauthentication, which reaches the
   * app as an `auth:change`.
   */
  it.each<[string, string, string, (a: Account) => Promise<unknown>, { body?: unknown, query?: unknown }]>([
    ['getEmailAddresses', 'GET', '/email', a => a.getEmailAddresses(), {}],
    ['addEmailAddress', 'POST', '/email', a => a.addEmailAddress({ email: 'new@example.com' }), { body: { email: 'new@example.com' } }],
    ['requestEmailVerification', 'PUT', '/email', a => a.requestEmailVerification({ email: 'new@example.com' }), { body: { email: 'new@example.com' } }],
    ['changePrimaryEmailAddress', 'PATCH', '/email', a => a.changePrimaryEmailAddress({ email: 'new@example.com', primary: true }), { body: { email: 'new@example.com', primary: true } }],
    ['removeEmailAddress', 'DELETE', '/email', a => a.removeEmailAddress({ email: 'old@example.com' }), { body: { email: 'old@example.com' } }],
    ['changePassword', 'POST', '/password/change', a => a.changePassword({ current_password: 'old', new_password: 'new' }), { body: { current_password: 'old', new_password: 'new' } }],
    ['connectedThirdPartyProviderAccounts', 'GET', '/providers', a => a.connectedThirdPartyProviderAccounts(), {}],
    ['disconnectThirdPartyProviderAccount', 'DELETE', '/providers', a => a.disconnectThirdPartyProviderAccount({ provider: 'google', account: 'uid-1' }), { body: { provider: 'google', account: 'uid-1' } }],
    ['getAuthenticators', 'GET', '/authenticators', a => a.getAuthenticators(), {}],
    ['totpAuthenticatorStatus', 'GET', '/authenticators/totp/svg', a => a.totpAuthenticatorStatus(), {}],
    ['activateTotp', 'POST', '/authenticators/totp', a => a.activateTotp({ code: '123456' }), { body: { code: '123456' } }],
    ['deactivateTotp', 'DELETE', '/authenticators/totp', a => a.deactivateTotp(), {}],
    ['getRecoveryCodes', 'GET', '/authenticators/recovery-codes', a => a.getRecoveryCodes(), {}],
    ['generateRecoveryCodes', 'POST', '/authenticators/recovery-codes', a => a.generateRecoveryCodes(), {}],
    ['getWebAuthnCreateOptions (passkey)', 'GET', '/authenticators/webauthn', a => a.getWebAuthnCreateOptions(true), { query: { passwordless: true } }],
    ['getWebAuthnCreateOptions (security key)', 'GET', '/authenticators/webauthn', a => a.getWebAuthnCreateOptions(false), { query: { passwordless: false } }],
    ['addWebAuthnCredential', 'POST', '/authenticators/webauthn', a => a.addWebAuthnCredential({ name: 'Key', credential }), { body: { name: 'Key', credential } }],
    ['deleteWebAuthnCredential', 'DELETE', '/authenticators/webauthn', a => a.deleteWebAuthnCredential({ authenticators: [1] }), { body: { authenticators: [1] } }],
    ['updateWebAuthnCredential', 'PUT', '/authenticators/webauthn', a => a.updateWebAuthnCredential({ id: 1, name: 'Renamed' }), { body: { id: 1, name: 'Renamed' } }],
  ])('%s sends %s %s and routes allauth\'s answers through the auth pipeline', async (_name, method, path, call, extra) => {
    const result = await call(useAllAuthAccount())

    const [request] = api.callsTo(`${ACCOUNT}${path}`)
    expect(api).toHaveBeenCalledTimes(1)
    expect(request?.options.method).toBe(method)
    expect(request?.options.body).toEqual(extra.body)
    expect(request?.options.query).toEqual(extra.query)
    expect(result).toEqual(REAUTH._data)
    expect(hooks.onResponse.mock.calls).toEqual([[OK]])
    expect(hooks.onResponseError.mock.calls).toEqual([[REAUTH]])
  })

  /** The storefront's own account endpoint is not allauth: its answers carry no auth state. */
  it('getUserAccount reads the Django account without touching the auth pipeline', async () => {
    await useAllAuthAccount().getUserAccount(7)

    expect(api.callsTo('/api/user/account/7')).toEqual([
      { url: '/api/user/account/7', options: expect.objectContaining({ method: 'GET' }) },
    ])
    expect(hooks.onResponse).not.toHaveBeenCalled()
    expect(hooks.onResponseError).not.toHaveBeenCalled()
  })
})
