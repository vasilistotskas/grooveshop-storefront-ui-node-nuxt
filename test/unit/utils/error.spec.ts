import { describe, it, expect } from 'vitest'
import { isErrorWithDetail, isAllAuthClientError } from '~/utils/error'
import { getErrorDetail } from '../../../shared/utils/error'

describe('Error Utils', () => {
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

    it('should return false for non-object', () => {
      expect(isErrorWithDetail('error')).toBe(false)
      expect(isErrorWithDetail(123)).toBe(false)
    })

    it('should return false for error without nested data', () => {
      const error = {
        data: 'error',
      }
      expect(isErrorWithDetail(error)).toBe(false)
    })

    it('should return false for error with non-string detail', () => {
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

    it('should return false for non-object', () => {
      expect(isAllAuthClientError('error')).toBe(false)
      expect(isAllAuthClientError(123)).toBe(false)
    })

    it('should return false for error without data property', () => {
      const error = {
        message: 'Error',
      }
      expect(isAllAuthClientError(error)).toBe(false)
    })

    // Note: isAllAuthClientError checks against specific AllAuth error response types
    // A "regular error" with just a message will return false because it doesn't match
    // any of the AllAuth error response schemas (BadResponse, NotAuthenticatedResponse, etc.)
  })

  describe('getErrorDetail', () => {
    it('reads detail from a forwarded upstream body (error.data.detail)', () => {
      expect(getErrorDetail({ data: { detail: 'Username already taken.' } }))
        .toBe('Username already taken.')
    })

    it('reads detail from the thrown-route wrapper (error.data.data.detail)', () => {
      expect(getErrorDetail({ data: { statusCode: 400, data: { detail: 'Bad cart.' } } }))
        .toBe('Bad cart.')
    })

    it('never falls back to the raw fetch message', () => {
      // ofetch messages like `[POST] "/api/orders": 400 Bad Request` are
      // always truthy — returning them made every `|| t('fallback')`
      // dead code and leaked request lines into customer-facing toasts.
      expect(getErrorDetail({
        message: '[POST] "/api/orders": 400 Bad Request',
        data: { statusCode: 400 },
      })).toBeUndefined()
      expect(getErrorDetail(new Error('boom'))).toBeUndefined()
      expect(getErrorDetail(undefined)).toBeUndefined()
      expect(getErrorDetail('nope')).toBeUndefined()
    })

    it('ignores empty or non-string detail values', () => {
      expect(getErrorDetail({ data: { detail: '' } })).toBeUndefined()
      expect(getErrorDetail({ data: { detail: 42 } })).toBeUndefined()
    })
  })
})
