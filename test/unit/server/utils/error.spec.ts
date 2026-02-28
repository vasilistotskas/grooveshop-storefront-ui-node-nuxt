import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ZodError } from 'zod'
import { FetchError } from 'ofetch'
import { H3Error } from 'h3'
import { isAllAuthError, handleError } from '../../../../server/utils/error'

const mockLog = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

describe('Server Utils - Error', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('log', mockLog)
  })

  describe('isAllAuthError', () => {
    it('should return false for non-object errors', () => {
      expect(isAllAuthError('string error')).toBe(false)
      expect(isAllAuthError(123)).toBe(false)
      expect(isAllAuthError(null)).toBe(false)
      expect(isAllAuthError(undefined)).toBe(false)
    })

    it('should return false for objects without data property', () => {
      expect(isAllAuthError({})).toBe(false)
      expect(isAllAuthError({ message: 'error' })).toBe(false)
    })

    it('should return true for bad response error (400)', () => {
      const error = {
        data: {
          status: 400,
          errors: [],
        },
      }

      // Mock the type guard functions
      vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(true))
      vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(false))

      expect(isAllAuthError(error)).toBe(true)
    })

    it('should return true for not authenticated error (401)', () => {
      const error = {
        data: {
          status: 401,
          meta: { is_authenticated: false },
        },
      }

      vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(true))
      vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(false))

      expect(isAllAuthError(error)).toBe(true)
    })

    it('should return true for invalid session error (410)', () => {
      const error = {
        data: {
          status: 410,
        },
      }

      vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(true))
      vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(false))

      expect(isAllAuthError(error)).toBe(true)
    })

    it('should return true for forbidden error (403)', () => {
      const error = {
        data: {
          status: 403,
        },
      }

      vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(true))
      vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(false))

      expect(isAllAuthError(error)).toBe(true)
    })

    it('should return true for not found error (404)', () => {
      const error = {
        data: {
          status: 404,
        },
      }

      vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(true))
      vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(false))

      expect(isAllAuthError(error)).toBe(true)
    })

    it('should return true for conflict error (409)', () => {
      const error = {
        data: {
          status: 409,
        },
      }

      vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(true))

      expect(isAllAuthError(error)).toBe(true)
    })

    it('should return false for non-AllAuth errors', () => {
      const error = {
        data: {
          status: 500,
          message: 'Internal Server Error',
        },
      }

      vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(false))
      vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(false))

      expect(isAllAuthError(error)).toBe(false)
    })
  })

  describe('handleError', () => {
    it('should throw ZodError', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ])

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn(err => err))

      expect(() => handleError(zodError)).toThrow()
      vi.unstubAllGlobals()
    })

    it('should throw FetchError', () => {
      const fetchError = new FetchError('Network error')

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn(err => err))

      expect(() => handleError(fetchError)).toThrow()
      vi.unstubAllGlobals()
    })

    it('should throw H3Error', () => {
      const h3Error = new H3Error('Bad Request')

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn(err => err))

      expect(() => handleError(h3Error)).toThrow()
      vi.unstubAllGlobals()
    })

    it('should throw generic error for unknown error types', () => {
      const unknownError = new Error('Unknown error')

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn((config) => {
        const error = new Error(config.statusMessage)
        Object.assign(error, config)
        return error
      }))

      try {
        handleError(unknownError)
        expect.fail('Should have thrown an error')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
        expect(error.statusMessage).toBe('Internal Server Error')
      }
      finally {
        vi.unstubAllGlobals()
      }
    })

    it('should log ZodError message', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ])

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn(err => err))

      try {
        handleError(zodError)
      }
      catch {
        // Expected to throw
      }

      expect(mockLog.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation' }))
      vi.unstubAllGlobals()
    })

    it('should log FetchError message', () => {
      const fetchError = new FetchError('Network error')

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn(err => err))

      try {
        handleError(fetchError)
      }
      catch {
        // Expected to throw
      }

      expect(mockLog.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'upstream:fetch' }))
      vi.unstubAllGlobals()
    })

    it('should log H3Error message', () => {
      const h3Error = new H3Error('Bad Request')

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn(err => err))

      try {
        handleError(h3Error)
      }
      catch {
        // Expected to throw
      }

      expect(mockLog.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'h3' }))
      vi.unstubAllGlobals()
    })

    it('should handle error with ZodError in data property', () => {
      const zodError = new ZodError([
        {
          code: 'invalid_type',
          expected: 'string',
          received: 'number',
          path: ['name'],
          message: 'Expected string, received number',
        },
      ])

      const errorWithData = {
        data: zodError,
      }

      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn((config) => {
        const error = new Error(config.statusMessage)
        Object.assign(error, config)
        return error
      }))

      try {
        handleError(errorWithData)
      }
      catch {
        // Expected to throw
      }

      expect(mockLog.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'validation' }))
      vi.unstubAllGlobals()
    })
  })

  describe('Edge Cases', () => {
    it('should handle null error', async () => {
      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn((config) => {
        const error = new Error(config.statusMessage)
        Object.assign(error, config)
        return error
      }))

      try {
        await handleError(null)
        expect.fail('Should have thrown an error')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
      }
      finally {
        vi.unstubAllGlobals()
      }
    })

    it('should handle undefined error', async () => {
      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn((config) => {
        const error = new Error(config.statusMessage)
        Object.assign(error, config)
        return error
      }))

      try {
        await handleError(undefined)
        expect.fail('Should have thrown an error')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
      }
      finally {
        vi.unstubAllGlobals()
      }
    })

    it('should handle string error', async () => {
      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn((config) => {
        const error = new Error(config.statusMessage)
        Object.assign(error, config)
        return error
      }))

      try {
        await handleError('String error')
        expect.fail('Should have thrown an error')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
      }
      finally {
        vi.unstubAllGlobals()
      }
    })

    it('should handle number error', async () => {
      vi.stubGlobal('log', mockLog)
      vi.stubGlobal('createError', vi.fn((config) => {
        const error = new Error(config.statusMessage)
        Object.assign(error, config)
        return error
      }))

      try {
        await handleError(404)
        expect.fail('Should have thrown an error')
      }
      catch (error: any) {
        expect(error.statusCode).toBe(500)
      }
      finally {
        vi.unstubAllGlobals()
      }
    })
  })
})
