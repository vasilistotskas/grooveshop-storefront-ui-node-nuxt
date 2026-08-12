import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isErrorWithDetail, isAllAuthClientError, isDrfFieldErrorMap, formatDrfFieldErrors } from '../../../app/utils/error'

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

  describe('isDrfFieldErrorMap', () => {
    it('recognizes a DRF field-error map', () => {
      expect(isDrfFieldErrorMap({ phone: ['Enter a valid phone number.'] })).toBe(true)
      expect(isDrfFieldErrorMap({
        phone: ['Enter a valid phone number.'],
        firstName: ['This field is required.', 'Too short.'],
      })).toBe(true)
    })

    it('rejects non-field-error shapes', () => {
      expect(isDrfFieldErrorMap({ detail: 'Not found.' })).toBe(false)
      expect(isDrfFieldErrorMap({ error: { type: 'invalid_order_data' } })).toBe(false)
      expect(isDrfFieldErrorMap({ phone: [] })).toBe(false)
      expect(isDrfFieldErrorMap({ phone: [42] })).toBe(false)
      expect(isDrfFieldErrorMap({})).toBe(false)
      expect(isDrfFieldErrorMap([])).toBe(false)
      expect(isDrfFieldErrorMap(null)).toBe(false)
      expect(isDrfFieldErrorMap('phone')).toBe(false)
    })

    it('rejects maps where only some values are message arrays', () => {
      expect(isDrfFieldErrorMap({
        phone: ['Enter a valid phone number.'],
        meta: { fbp: 'x' },
      })).toBe(false)
    })
  })

  describe('formatDrfFieldErrors', () => {
    const t = (key: string) => (key === 'form.phone' ? 'Τηλέφωνο' : key)

    it('labels fields via the form.* i18n namespace', () => {
      expect(formatDrfFieldErrors({ phone: ['Enter a valid phone number.'] }, t))
        .toBe('Τηλέφωνο: Enter a valid phone number.')
    })

    it('falls back to the raw field name when no label exists and snake_cases the lookup', () => {
      // firstName → form.first_name (missing in the stub t → echo key → raw name)
      expect(formatDrfFieldErrors({ firstName: ['Too short.'] }, t))
        .toBe('firstName: Too short.')
    })

    it('joins multiple fields and messages', () => {
      expect(formatDrfFieldErrors({
        phone: ['Enter a valid phone number.'],
        firstName: ['This field is required.', 'Too short.'],
      }, t)).toBe(
        'Τηλέφωνο: Enter a valid phone number.\nfirstName: This field is required. Too short.',
      )
    })
  })
})
