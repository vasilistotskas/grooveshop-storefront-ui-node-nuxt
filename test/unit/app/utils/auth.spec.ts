import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthChangeEvent } from '~~/shared/constants'
import {
  authInfo,
  determineAuthChangeEvent,
  isAllAuthResponseSuccess,
  isAllAuthResponseError,
  isSafeRelativePath,
  getPendingFlows,
  getPendingFlow,
  extractAllAuthError,
  pathForFlow,
  pathForPendingFlow,
  pendingFlowRouteNameFromError,
  pickPreferredAuthenticatorType,
} from '~/utils/auth'

/**
 * The pure half of `app/utils/auth.ts`. The flow constants (`Flows`,
 * `Flow2path`, `AUTHENTICATOR_TYPE_PRIORITY`) resolve to the real
 * `shared/constants` through the unit project's auto-imports; only
 * evlog's `log`, which that project does not provide, is stubbed. The
 * helpers that navigate or call hooks are `test/nuxt/utils/auth.spec.ts`.
 */
const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('Utils - Auth', () => {
  beforeEach(() => {
    vi.stubGlobal('log', mockLog)
  })

  describe('authInfo', () => {
    it('should return default auth info when response is null', () => {
      const result = authInfo(null)

      expect(result).toEqual({
        isAuthenticated: false,
        requiresReauthentication: false,
        user: null,
        pendingFlow: null,
      })
    })

    it('should return default auth info when response is undefined', () => {
      const result = authInfo(undefined)

      expect(result).toEqual({
        isAuthenticated: false,
        requiresReauthentication: false,
        user: null,
        pendingFlow: null,
      })
    })

    it('should identify authenticated user from 200 response', () => {
      const response: AllAuthResponse = {
        status: 200,
        meta: { is_authenticated: true },
        data: {
          user: { id: 1, email: 'test@example.com', username: 'test' },
          methods: [],
        },
      }

      const result = authInfo(response)

      expect(result.isAuthenticated).toBe(true)
      expect(result.requiresReauthentication).toBe(false)
      expect(result.user).toEqual(response.data.user)
    })

    it('should identify reauthentication required from 401 response', () => {
      const response: AllAuthResponse = {
        status: 401,
        meta: { is_authenticated: true },
        data: {
          user: { id: 1, email: 'test@example.com', username: 'test' },
          methods: [],
        },
      }

      const result = authInfo(response)

      expect(result.isAuthenticated).toBe(true)
      expect(result.requiresReauthentication).toBe(true)
    })

    it('should identify pending flow', () => {
      const pendingFlow = { id: 'verify_email', is_pending: true, types: [] }
      const response: AllAuthResponse = {
        status: 200,
        meta: { is_authenticated: false },
        data: {
          flows: [pendingFlow],
          methods: [],
        },
      }

      const result = authInfo(response)

      expect(result.pendingFlow).toEqual(pendingFlow)
    })

    it('should handle response without user', () => {
      const response: AllAuthResponse = {
        status: 200,
        meta: { is_authenticated: true },
        data: {
          methods: [],
        },
      }

      const result = authInfo(response)

      expect(result.isAuthenticated).toBe(true)
      expect(result.user).toBeUndefined()
    })
  })

  describe('isAllAuthResponseSuccess', () => {
    it('should return true for 200 status', () => {
      const response: AllAuthResponse = {
        status: 200,
        meta: {},
        data: { methods: [] },
      }

      expect(isAllAuthResponseSuccess(response)).toBe(true)
    })

    it('should return false for non-200 status', () => {
      const response: AllAuthResponseError = {
        status: 401,
        meta: {},
        errors: [],
      }

      expect(isAllAuthResponseSuccess(response)).toBe(false)
    })
  })

  describe('isAllAuthResponseError', () => {
    it('should return true for non-200 status', () => {
      const response: AllAuthResponseError = {
        status: 400,
        meta: {},
        errors: [],
      }

      expect(isAllAuthResponseError(response)).toBe(true)
    })

    it('should return false for 200 status', () => {
      const response: AllAuthResponse = {
        status: 200,
        meta: {},
        data: { methods: [] },
      }

      expect(isAllAuthResponseError(response)).toBe(false)
    })
  })

  describe('getPendingFlows', () => {
    it('should return pending flows from response', () => {
      const pendingFlow1 = { id: 'flow1', is_pending: true, types: [] }
      const pendingFlow2 = { id: 'flow2', is_pending: true, types: [] }
      const completedFlow = { id: 'flow3', is_pending: false, types: [] }

      const response: AllAuthResponse = {
        status: 200,
        meta: {},
        data: {
          flows: [pendingFlow1, completedFlow, pendingFlow2],
          methods: [],
        },
      }

      const result = getPendingFlows(response)

      expect(result).toHaveLength(2)
      expect(result).toContain(pendingFlow1)
      expect(result).toContain(pendingFlow2)
      expect(result).not.toContain(completedFlow)
    })

    it('should return empty array when no flows exist', () => {
      const response: AllAuthResponse = {
        status: 200,
        meta: {},
        data: { methods: [] },
      }

      const result = getPendingFlows(response)

      expect(result).toEqual([])
    })

    it('should return empty array for error response without data', () => {
      const response: AllAuthResponseError = {
        status: 400,
        meta: {},
        errors: [],
      }

      const result = getPendingFlows(response)

      expect(result).toEqual([])
    })
  })

  describe('getPendingFlow', () => {
    it('should return first pending flow', () => {
      const pendingFlow1 = { id: 'flow1', is_pending: true, types: [] }
      const pendingFlow2 = { id: 'flow2', is_pending: true, types: [] }

      const response: AllAuthResponse = {
        status: 200,
        meta: {},
        data: {
          flows: [pendingFlow1, pendingFlow2],
          methods: [],
        },
      }

      const result = getPendingFlow(response)

      expect(result).toEqual(pendingFlow1)
    })

    it('should return null when no pending flows exist', () => {
      const response: AllAuthResponse = {
        status: 200,
        meta: {},
        data: {
          flows: [{ id: 'flow1', is_pending: false, types: [] }],
          methods: [],
        },
      }

      const result = getPendingFlow(response)

      expect(result).toBeNull()
    })

    it('should return null when no flows exist', () => {
      const response: AllAuthResponse = {
        status: 200,
        meta: {},
        data: { methods: [] },
      }

      const result = getPendingFlow(response)

      expect(result).toBeNull()
    })
  })

  // The thrown $fetch error's real shape: error.data is Nitro's error wrapper
  // (`statusCode`, not `status`), and the allauth payload sits at
  // error.data.data. Build it that way so the tests match production.
  const wrapAllAuthError = (payload: unknown) => ({
    data: { statusCode: 401, statusMessage: 'Unauthorized', data: payload },
  })

  describe('extractAllAuthError', () => {
    it('unwraps the allauth payload from the Nitro error wrapper (error.data.data)', () => {
      const payload = {
        status: 401,
        data: { flows: [{ id: 'login_by_code', is_pending: true }] },
        meta: { is_authenticated: false },
      }

      expect(extractAllAuthError(wrapAllAuthError(payload))).toEqual(payload)
    })

    it('also accepts a payload exposed directly at error.data', () => {
      const payload = {
        status: 401,
        data: { flows: [] },
        meta: { is_authenticated: false },
      }

      expect(extractAllAuthError({ data: payload })).toEqual(payload)
    })

    it('returns null for a non-allauth error shape', () => {
      expect(extractAllAuthError({ data: { message: 'boom' } })).toBeNull()
      expect(extractAllAuthError(new Error('nope'))).toBeNull()
      expect(extractAllAuthError(null)).toBeNull()
    })
  })

  describe('pendingFlowRouteNameFromError', () => {
    it('routes a login_by_code pending flow to the confirm page', () => {
      const error = wrapAllAuthError({
        status: 401,
        data: { flows: [{ id: 'login_by_code', is_pending: true }] },
        meta: { is_authenticated: false },
      })

      expect(pendingFlowRouteNameFromError(error)).toBe('account-login-code-confirm')
    })

    it('routes a pending mfa_authenticate flow to the preferred second factor', () => {
      const error = wrapAllAuthError({
        status: 401,
        data: {
          flows: [{
            id: 'mfa_authenticate',
            is_pending: true,
            types: ['recovery_codes', 'webauthn'],
          }],
        },
        meta: { is_authenticated: false },
      })

      // webauthn outranks recovery_codes in AUTHENTICATOR_TYPE_PRIORITY.
      expect(pendingFlowRouteNameFromError(error)).toBe('account-2fa-authenticate-webauthn')
    })

    it('returns null when the 401 carries no pending flow (a genuine error)', () => {
      const error = wrapAllAuthError({
        status: 401,
        data: { flows: [{ id: 'login', is_pending: false }] },
        meta: { is_authenticated: false },
      })

      expect(pendingFlowRouteNameFromError(error)).toBeNull()
    })

    it('returns null for a non-allauth error', () => {
      expect(pendingFlowRouteNameFromError(new Error('network'))).toBeNull()
    })
  })

  describe('isSafeRelativePath', () => {
    // The open-redirect guard for `?next=`: a login that bounces the
    // shopper to an attacker's page after they authenticate is the
    // phishing shape this exists to stop.
    it.each([
      '/account',
      '/account?x=1',
      '/products/shoes#reviews',
      '  /account  ',
    ])('allows the same-site path %j', (value) => {
      expect(isSafeRelativePath(value)).toBe(true)
    })

    it.each([
      ['protocol-relative', '//evil.com'],
      ['protocol-relative after whitespace', '  //evil.com'],
      ['a backslash (browsers read /\\ as //)', '/\\evil.com'],
      ['a backslash anywhere', '/account\\..\\evil'],
      ['absolute http', 'http://evil.com'],
      ['absolute https', 'https://evil.com/account'],
      ['javascript:', 'javascript:alert(1)'],
      ['JavaScript: in mixed case', 'JaVaScRiPt:alert(1)'],
      ['data:', 'data:text/html,<script>alert(1)</script>'],
      ['vbscript:', 'vbscript:msgbox(1)'],
      ['a relative path', 'account'],
      ['empty', ''],
      ['whitespace only', '   '],
      ['undefined', undefined],
    ])('rejects %s', (_case, value) => {
      expect(isSafeRelativePath(value)).toBe(false)
    })
  })

  describe('determineAuthChangeEvent', () => {
    const user = (id: number) => ({ id, email: `u${id}@shop.test`, username: `u${id}` })
    const signedIn = (id = 1, extra: Record<string, unknown> = {}, methods: unknown[] = [{}]) => ({
      status: 200,
      meta: { is_authenticated: true, ...extra },
      data: { user: user(id), methods },
    }) as unknown as AllAuthResponse
    const reauthRequired = { status: 401, meta: { is_authenticated: true }, data: { flows: [] } } as unknown as AllAuthResponseError
    const signedOut = (flows: unknown[] = []) =>
      ({ status: 401, meta: { is_authenticated: false }, data: { flows } }) as unknown as AllAuthResponseError
    // Even one carrying a pending flow: a dead session is not a flow step.
    const gone = { status: 410, meta: { is_authenticated: false }, data: { flows: [{ id: 'login', is_pending: true }] } } as unknown as AllAuthResponseError

    it.each([
      ['a torn-down session (410), whatever came before', gone, signedOut(), AuthChangeEvent.LOGGED_OUT],
      ['a new session that carries a session token', signedIn(1, { session_token: 's' }), null, AuthChangeEvent.LOGGED_IN],
      ['a new session that carries an access token', signedIn(1, { access_token: 'a' }), signedOut(), AuthChangeEvent.LOGGED_IN],
      ['a session that now asks to re-authenticate', reauthRequired, signedIn(), AuthChangeEvent.REAUTHENTICATION_REQUIRED],
      ['a re-authentication request on a fresh load', reauthRequired, null, AuthChangeEvent.REAUTHENTICATION_REQUIRED],
      ['a re-authentication that was asked for and given', signedIn(), reauthRequired, AuthChangeEvent.REAUTHENTICATED],
      ['a session that gained an authentication method', signedIn(1, {}, [{}, {}]), signedIn(1, {}, [{}]), AuthChangeEvent.REAUTHENTICATED],
      ['a re-authentication still outstanding', reauthRequired, reauthRequired, AuthChangeEvent.REAUTHENTICATION_REQUIRED],
      ['a session that ended', signedOut(), signedIn(), AuthChangeEvent.LOGGED_OUT],
      ['an anonymous visitor who stays anonymous', signedOut(), signedOut(), AuthChangeEvent.LOGGED_OUT],
      ['an anonymous visitor who reached a new flow step', signedOut([{ id: 'login_by_code', is_pending: true }]), signedOut(), AuthChangeEvent.FLOW_UPDATED],
    ])('reports %s', (_case, next, previous, event) => {
      expect(determineAuthChangeEvent(next, previous)).toBe(event)
    })

    it('reports nothing for an unchanged session', () => {
      expect(determineAuthChangeEvent(signedIn(), signedIn())).toBeNull()
    })

    it('treats a different user as a new sign-in, not an unchanged session', () => {
      // Without the reset, user 2 arriving on user 1's tab reads as
      // "was and is authenticated" — no event, and user 1's stores stay.
      expect(determineAuthChangeEvent(signedIn(2, { session_token: 's' }), signedIn(1))).toBe(AuthChangeEvent.LOGGED_IN)
    })
  })

  describe('pickPreferredAuthenticatorType', () => {
    it.each([
      [['recovery_codes', 'totp', 'webauthn'], 'webauthn'],
      [['recovery_codes', 'totp'], 'totp'],
      [['recovery_codes'], 'recovery_codes'],
      [['sms'], 'sms'],
    ])('picks the strongest of %j', (types, expected) => {
      expect(pickPreferredAuthenticatorType(types)).toBe(expected)
    })

    it.each([[[]], [null], [undefined]])('has no preference among %j', (types) => {
      expect(pickPreferredAuthenticatorType(types)).toBeUndefined()
    })
  })

  describe('pathForFlow', () => {
    const signedOutWith = (flows: unknown[]) =>
      ({ status: 401, meta: { is_authenticated: false }, data: { flows } }) as unknown as AllAuthResponseError

    it('routes a typed flow by its preferred authenticator, or the one asked for', () => {
      const flow = { id: 'mfa_authenticate', is_pending: true, types: ['totp', 'webauthn'] } as Flow
      expect(pathForFlow(flow)).toBe('account-2fa-authenticate-webauthn')
      expect(pathForFlow(flow, 'totp')).toBe('account-2fa-authenticate-totp')
    })

    it('has no page for the external OAuth redirect', () => {
      expect(pathForFlow({ id: 'provider_redirect', is_pending: true } as Flow)).toBeNull()
    })

    it('fails loudly for a flow with no page', () => {
      expect(() => pathForFlow({ id: 'unheard_of', is_pending: true } as Flow)).toThrow('Unknown path for flow: unheard_of')
    })

    it('routes the pending flow of a response, and nothing without one', () => {
      expect(pathForPendingFlow(signedOutWith([{ id: 'verify_email', is_pending: true }]))).toBe('account-verify-email')
      expect(pathForPendingFlow(signedOutWith([{ id: 'verify_email', is_pending: false }]))).toBeNull()
    })
  })
})
