import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  authInfo,
  isAllAuthResponseSuccess,
  isAllAuthResponseError,
  getPendingFlows,
  getPendingFlow,
  extractAllAuthError,
  pendingFlowRouteNameFromError,
} from '../../../app/utils/auth'

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('Utils - Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('log', mockLog)
    // pathForFlow() relies on these auto-imported constants, which are not
    // present in the bare unit env — stub them with their real values so
    // the flow-routing helpers can be exercised (mirrors app/shared).
    vi.stubGlobal('Flows', {
      PROVIDER_REDIRECT: 'provider_redirect',
      LOGIN_BY_CODE: 'login_by_code',
      MFA_AUTHENTICATE: 'mfa_authenticate',
    })
    vi.stubGlobal('AUTHENTICATOR_TYPE_PRIORITY', ['webauthn', 'totp', 'recovery_codes'])
    vi.stubGlobal('Flow2path', {
      login_by_code: 'account-login-code-confirm',
      'mfa_authenticate:webauthn': 'account-2fa-authenticate-webauthn',
      'mfa_authenticate:totp': 'account-2fa-authenticate-totp',
      'mfa_authenticate:recovery_codes': 'account-2fa-authenticate-recovery-codes',
    })
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
})
