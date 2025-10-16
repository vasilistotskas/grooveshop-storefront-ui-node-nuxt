import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  authInfo,
  isAllAuthResponseSuccess,
  isAllAuthResponseError,
  getPendingFlows,
  getPendingFlow,
} from '../../../app/utils/auth'

describe('Utils - Auth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    it('should return last pending flow', () => {
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

      expect(result).toEqual(pendingFlow2)
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
})
