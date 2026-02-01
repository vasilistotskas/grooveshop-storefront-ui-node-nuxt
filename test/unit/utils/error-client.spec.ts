import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isErrorWithDetail, isAllAuthClientError } from '../../../app/utils/error'

// Mock the shared utils that are auto-imported in Nuxt
vi.stubGlobal('isBadResponseError', vi.fn().mockReturnValue(false))
vi.stubGlobal('isNotAuthenticatedResponseError', vi.fn().mockReturnValue(false))
vi.stubGlobal('isInvalidSessionResponseError', vi.fn().mockReturnValue(false))
vi.stubGlobal('isForbiddenResponseError', vi.fn().mockReturnValue(false))
vi.stubGlobal('isNotFoundResponseError', vi.fn().mockReturnValue(false))
vi.stubGlobal('isConflictResponseError', vi.fn().mockReturnValue(false))

describe('Utils - Error Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('isErrorWithDetail', () => {
    it('should return true for error with detail', () => {
      const error = {
        data: {
          data: {
            detail: 'Error message',
          },
        },
      }

      expect(isErrorWithDetail(error)).toBe(true)
    })

    it('should return false for error without detail', () => {
      const error = {
        data: {
          data: {
            message: 'Error message',
          },
        },
      }

      expect(isErrorWithDetail(error)).toBe(false)
    })

    it('should return false for null', () => {
      expect(isErrorWithDetail(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isErrorWithDetail(undefined)).toBe(false)
    })

    it('should return false for string', () => {
      expect(isErrorWithDetail('error')).toBe(false)
    })

    it('should return false for number', () => {
      expect(isErrorWithDetail(123)).toBe(false)
    })

    it('should return false for error without nested data', () => {
      const error = {
        data: {
          message: 'Error',
        },
      }

      expect(isErrorWithDetail(error)).toBe(false)
    })

    it('should return false when detail is not a string', () => {
      const error = {
        data: {
          data: {
            detail: 123,
          },
        },
      }

      expect(isErrorWithDetail(error)).toBe(false)
    })
  })

  describe('isAllAuthClientError', () => {
    it('should return false for null', () => {
      expect(isAllAuthClientError(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isAllAuthClientError(undefined)).toBe(false)
    })

    it('should return false for string', () => {
      expect(isAllAuthClientError('error')).toBe(false)
    })

    it('should return false for number', () => {
      expect(isAllAuthClientError(123)).toBe(false)
    })

    it('should return false for object without data', () => {
      const error = {
        message: 'Error',
      }

      expect(isAllAuthClientError(error)).toBe(false)
    })

    it('should return false for empty object', () => {
      expect(isAllAuthClientError({})).toBe(false)
    })

    it('should return false for array', () => {
      expect(isAllAuthClientError([])).toBe(false)
    })
  })
})
