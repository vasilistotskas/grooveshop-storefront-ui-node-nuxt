import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setTenant } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const { hooks, ga4, metaPixel, tiktokPixel, route } = vi.hoisted(() => ({
  route: { query: {} as Record<string, string> },
  hooks: {
    onResponse: vi.fn((..._args: unknown[]) => Promise.resolve()),
    onResponseError: vi.fn((..._args: unknown[]) => Promise.resolve()),
  },
  ga4: { trackLogin: vi.fn(), trackSignUp: vi.fn() },
  metaPixel: { trackCompleteRegistration: vi.fn() },
  tiktokPixel: { trackCompleteRegistration: vi.fn() },
}))

mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('onAllAuthResponse', () => hooks.onResponse)
mockNuxtImport('onAllAuthResponseError', () => hooks.onResponseError)
mockNuxtImport('useGA4', () => () => ga4)
mockNuxtImport('useMetaPixel', () => () => metaPixel)
mockNuxtImport('useTikTokPixel', () => () => tiktokPixel)
mockNuxtImport('useRoute', () => () => route)

const AUTH = '/api/_allauth/app/v1/auth'
const OK = { ok: true, status: 200, _data: { status: 200, meta: { is_authenticated: true } } }
const MFA_PENDING = { ok: false, status: 401, _data: { data: { status: 401, data: { flows: [{ id: 'mfa_authenticate', is_pending: true }] } } } }

/**
 * ofetch runs `onResponse` for every response and `onResponseError`
 * after it for a non-2xx one. The mock plays that part with the given
 * responses, so a spec sees what each wrapper does in its hooks.
 */
function respondWith(...responses: Array<{ ok: boolean, status: number, _data: unknown }>) {
  api.mockImplementation(async (_url, options) => {
    for (const response of responses) {
      await options?.onResponse?.({ response })
      if (!response.ok) await options?.onResponseError?.({ response })
    }
    return responses.at(-1)?._data
  })
}

const credential = { type: 'public-key', id: 'credential-id', rawId: 'raw-id', response: {} }

type Authentication = ReturnType<typeof useAllAuthAuthentication>

describe('useAllAuthAuthentication', () => {
  beforeEach(() => {
    respondWith(OK, MFA_PENDING)
  })

  /**
   * Every wrapper is one request to one allauth endpoint whose answers go
   * through the auth pipeline (`onAllAuthResponse` for the response,
   * `onAllAuthResponseError` for a failure) — the `auth:change` hook is
   * how a login, logout or pending flow reaches the rest of the app.
   */
  it.each<[string, string, string, (a: Authentication) => Promise<unknown>, unknown]>([
    ['getSession', 'GET', '/session', a => a.getSession(), undefined],
    ['deleteSession', 'DELETE', '/session', a => a.deleteSession(), undefined],
    ['login', 'POST', '/login', a => a.login({ email: 'shopper@example.com', password: 'secret' }), { email: 'shopper@example.com', password: 'secret' }],
    ['signup', 'POST', '/signup', a => a.signup({ email: 'new@example.com', password: 'secret' }), { email: 'new@example.com', password: 'secret' }],
    ['getEmailVerify', 'GET', '/email/verify', a => a.getEmailVerify('verify-key'), undefined],
    ['emailVerify', 'POST', '/email/verify', a => a.emailVerify({ key: 'verify-key' }), { key: 'verify-key' }],
    ['reauthenticate', 'POST', '/reauthenticate', a => a.reauthenticate({ password: 'secret' }), { password: 'secret' }],
    ['passwordRequest', 'POST', '/password/request', a => a.passwordRequest({ email: 'shopper@example.com' }), { email: 'shopper@example.com' }],
    ['getPasswordReset', 'GET', '/password/reset', a => a.getPasswordReset('reset-key'), undefined],
    ['passwordReset', 'POST', '/password/reset', a => a.passwordReset({ key: 'reset-key', password: 'new-secret' }), { key: 'reset-key', password: 'new-secret' }],
    ['providerToken', 'POST', '/provider/token', a => a.providerToken({ provider: 'google', process: 'login', token: { client_id: 'client', access_token: 'token' } }), { provider: 'google', process: 'login', token: { client_id: 'client', access_token: 'token' } }],
    ['providerSignup', 'POST', '/provider/signup', a => a.providerSignup({ email: 'shopper@example.com' }), { email: 'shopper@example.com' }],
    ['twoFaAuthenticate', 'POST', '/2fa/authenticate', a => a.twoFaAuthenticate({ code: '123456' }), { code: '123456' }],
    ['twoFaReauthenticate', 'POST', '/2fa/reauthenticate', a => a.twoFaReauthenticate({ code: '123456' }), { code: '123456' }],
    ['requestLoginCode', 'POST', '/code/request', a => a.requestLoginCode({ email: 'shopper@example.com' }), { email: 'shopper@example.com' }],
    ['confirmLoginCode', 'POST', '/code/confirm', a => a.confirmLoginCode({ code: '123456' }), { code: '123456' }],
    ['getWebAuthnRequestOptionsForReauthentication', 'GET', '/webauthn/reauthenticate', a => a.getWebAuthnRequestOptionsForReauthentication(), undefined],
    ['reauthenticateUsingWebAuthn', 'POST', '/webauthn/reauthenticate', a => a.reauthenticateUsingWebAuthn({ credential }), { credential }],
    ['getWebAuthnRequestOptionsForAuthentication', 'GET', '/webauthn/authenticate', a => a.getWebAuthnRequestOptionsForAuthentication(), undefined],
    ['authenticateUsingWebAuthn', 'POST', '/webauthn/authenticate', a => a.authenticateUsingWebAuthn({ credential }), { credential }],
    ['getWebAuthnRequestOptionsForLogin', 'GET', '/webauthn/login', a => a.getWebAuthnRequestOptionsForLogin(), undefined],
    ['loginUsingWebAuthn', 'POST', '/webauthn/login', a => a.loginUsingWebAuthn({ credential }), { credential }],
    ['getWebAuthnCreateOptionsAtSignup', 'GET', '/webauthn/signup', a => a.getWebAuthnCreateOptionsAtSignup(), undefined],
    ['signUpByPasskey', 'POST', '/webauthn/signup', a => a.signUpByPasskey({ email: 'shopper@example.com' }), { email: 'shopper@example.com' }],
    ['signupWebAuthnCredential', 'PUT', '/webauthn/signup', a => a.signupWebAuthnCredential({ name: 'Passkey', credential }), { name: 'Passkey', credential }],
  ])('%s sends %s %s and routes allauth\'s answers through the auth pipeline', async (_name, method, path, call, body) => {
    const result = await call(useAllAuthAuthentication())

    const [request] = api.callsTo(`${AUTH}${path}`)
    expect(api).toHaveBeenCalledTimes(1)
    expect(request?.options.method).toBe(method)
    expect(request?.options.body).toEqual(body)
    expect(result).toEqual(MFA_PENDING._data)
    expect(hooks.onResponse.mock.calls.map(([response]) => response)).toEqual([OK, MFA_PENDING])
    expect(hooks.onResponseError.mock.calls.map(([response]) => response)).toEqual([MFA_PENDING])
  })

  describe('request headers', () => {
    it.each<[string, (a: Authentication) => Promise<unknown>, string, Record<string, string>]>([
      ['getEmailVerify', a => a.getEmailVerify('verify-key'), '/email/verify', { 'X-Email-Verification-Key': 'verify-key' }],
      ['getPasswordReset', a => a.getPasswordReset('reset-key'), '/password/reset', { 'X-Password-Reset-Key': 'reset-key' }],
    ])('%s carries the key allauth reads from a header', async (_name, call, path, headers) => {
      await call(useAllAuthAuthentication())

      expect(api.callsTo(`${AUTH}${path}`)[0]?.options.headers).toEqual(expect.objectContaining(headers))
    })
  })

  describe('deleteSession', () => {
    /** `explicit` is what lets the auth plugin keep a user-initiated logout silent. */
    it.each([
      [{ explicit: true }, { explicit: true }],
      [undefined, { explicit: false }],
    ])('passes %o to both auth hooks as %o', async (args, meta) => {
      await useAllAuthAuthentication().deleteSession(args)

      expect(hooks.onResponse).toHaveBeenCalledWith(OK, meta)
      expect(hooks.onResponseError).toHaveBeenCalledWith(MFA_PENDING, meta)
    })
  })

  describe('login', () => {
    it('reports the login to GA4 once allauth has signed the user in', async () => {
      respondWith(OK)

      await useAllAuthAuthentication().login({ email: 'shopper@example.com', password: 'secret' })

      expect(ga4.trackLogin).toHaveBeenCalledExactlyOnceWith({ method: 'email' })
    })

    it('does not report a login that still needs the second factor', async () => {
      respondWith(MFA_PENDING)

      await useAllAuthAuthentication().login({ email: 'shopper@example.com', password: 'secret' })

      expect(ga4.trackLogin).not.toHaveBeenCalled()
      expect(hooks.onResponseError).toHaveBeenCalledWith(MFA_PENDING)
    })

    it('still signs the user in when GA4 throws', async () => {
      respondWith(OK)
      ga4.trackLogin.mockImplementationOnce(() => {
        throw new Error('gtag missing')
      })

      await expect(useAllAuthAuthentication().login({ email: 'shopper@example.com', password: 'secret' }))
        .resolves.toEqual(OK._data)
      expect(hooks.onResponse).toHaveBeenCalledWith(OK)
    })
  })

  describe('signup', () => {
    it('fires the registration events of every provider once the account exists', async () => {
      respondWith(OK)

      await useAllAuthAuthentication().signup({ email: 'new@example.com', password: 'secret' })

      expect(metaPixel.trackCompleteRegistration).toHaveBeenCalledExactlyOnceWith({ status: 'completed' })
      expect(tiktokPixel.trackCompleteRegistration).toHaveBeenCalledOnce()
      expect(ga4.trackSignUp).toHaveBeenCalledExactlyOnceWith({ method: 'email' })
    })

    it('fires no registration event for a signup allauth did not complete', async () => {
      respondWith(MFA_PENDING)

      await useAllAuthAuthentication().signup({ email: 'new@example.com', password: 'secret' })

      expect(metaPixel.trackCompleteRegistration).not.toHaveBeenCalled()
      expect(tiktokPixel.trackCompleteRegistration).not.toHaveBeenCalled()
      expect(ga4.trackSignUp).not.toHaveBeenCalled()
    })

    it('still completes the signup when a pixel throws', async () => {
      respondWith(OK)
      metaPixel.trackCompleteRegistration.mockImplementationOnce(() => {
        throw new Error('fbq missing')
      })

      await expect(useAllAuthAuthentication().signup({ email: 'new@example.com', password: 'secret' }))
        .resolves.toEqual(OK._data)
    })
  })

  describe('providerRedirect', () => {
    let replace: ReturnType<typeof vi.fn>

    beforeEach(() => {
      replace = vi.fn()
      vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, replace } as Location)
      route.query = {}
    })

    it.each([
      ['login' as const, { redirect: '/checkout' }, '/auth/google?redirect=%2Fcheckout&process=login'],
      ['connect' as const, {}, '/auth/google?process=connect'],
    ])('sends a %s to the provider, keeping the page to return to', (process, query, target) => {
      route.query = query

      useAllAuthAuthentication().providerRedirect({ id: 'google', name: 'Google', flows: ['provider_redirect'] }, process)

      expect(replace).toHaveBeenCalledExactlyOnceWith(target)
    })
  })

  describe('browserProviderRedirect', () => {
    // Regression guard: posting to the PLATFORM's config.public.djangoUrl
    // for every tenant would execute the OAuth flow in the platform's
    // Django tenant schema instead of the resolved tenant's — a real
    // cross-tenant auth bug.
    const body = { provider: 'google', callback_url: 'https://example.com/callback', process: 'login' as const }
    let djangoUrl: string

    beforeEach(() => {
      document.body.innerHTML = ''
      vi.spyOn(HTMLFormElement.prototype, 'submit').mockImplementation(() => {})
      djangoUrl = useRuntimeConfig().public.djangoUrl
    })

    afterEach(() => {
      useRuntimeConfig().public.djangoUrl = djangoUrl
      document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
      setTenant()
    })

    function submittedForm() {
      const form = document.body.querySelector('form')!
      return {
        action: form.action,
        method: form.method.toLowerCase(),
        fields: Object.fromEntries([...form.querySelectorAll('input')].map(input => [input.name, input.value])),
      }
    }

    it('posts the body and the CSRF token to the tenant API origin', async () => {
      setTenant({ apiDomain: 'api.tenant.example' })
      document.cookie = 'csrftoken=csrf-123; path=/'

      await useAllAuthAuthentication().browserProviderRedirect(body)

      expect(submittedForm()).toEqual({
        action: 'https://api.tenant.example/_allauth/browser/v1/auth/provider/redirect',
        method: 'post',
        fields: { ...body, csrfmiddlewaretoken: 'csrf-123' },
      })
      expect(HTMLFormElement.prototype.submit).toHaveBeenCalledOnce()
    })

    it('falls back to the platform djangoUrl when the tenant has no apiDomain', async () => {
      setTenant({ apiDomain: '' })
      // Assign an absolute value explicitly — reading a form element's
      // `.action` back from the DOM always resolves relative strings
      // against the current document location, which would mask a bug
      // in the empty-djangoUrl case.
      useRuntimeConfig().public.djangoUrl = 'https://platform.example'

      await useAllAuthAuthentication().browserProviderRedirect(body)

      expect(submittedForm().action).toBe('https://platform.example/_allauth/browser/v1/auth/provider/redirect')
      expect(submittedForm().fields).not.toHaveProperty('csrfmiddlewaretoken')
    })
  })
})
