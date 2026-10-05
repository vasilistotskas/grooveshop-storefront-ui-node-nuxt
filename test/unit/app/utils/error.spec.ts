import { describe, it, expect } from 'vitest'
import {
  formatDrfFieldErrors,
  isAllAuthClientError,
  isDrfFieldErrorMap,
  isConflictClientError,
  isErrorWithDetail,
  isRateLimitedClientError,
} from '~/utils/error'

/**
 * The pure error helpers of `app/utils/error.ts`. The allauth guards
 * `isAllAuthClientError` builds on are the real ones (auto-imported
 * from `shared/utils/allAuthErrorGuards.ts`); `handleAllAuthClientError`,
 * which toasts, is `test/nuxt/utils/error.spec.ts`.
 */
describe('isErrorWithDetail', () => {
  it('recognises a detail string under the thrown-route wrapper', () => {
    expect(isErrorWithDetail({ data: { data: { detail: 'Error message' } } })).toBe(true)
  })

  it.each([
    ['no detail', { data: { data: { message: 'Error message' } } }],
    ['a non-string detail', { data: { data: { detail: 123 } } }],
    ['a detail one level up only', { data: { detail: 'Error message' } }],
    ['no nested data', { data: 'error' }],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'error'],
    ['a number', 123],
  ])('rejects %s', (_case, error) => {
    expect(isErrorWithDetail(error)).toBe(false)
  })
})

describe('isAllAuthClientError', () => {
  // `$fetch` rejects with Nitro's wrapper at `error.data`; the allauth
  // body sits under it, which is where the guards look.
  const thrown = (body: unknown) => ({ data: { statusCode: 400, data: body } })

  it.each([
    ['400 (field errors)', { status: 400, errors: [{ code: 'invalid', message: 'Invalid.' }] }],
    ['401 (pending flows)', { status: 401, data: { flows: [] }, meta: { is_authenticated: false } }],
    ['403', { status: 403 }],
    ['404', { status: 404, meta: { secret: 's' } }],
    ['409', { status: 409 }],
    ['410 (session gone)', { status: 410, data: { flows: [] }, meta: { is_authenticated: false } }],
  ])('recognises an allauth %s answer', (_case, body) => {
    expect(isAllAuthClientError(thrown(body))).toBe(true)
  })

  it.each([
    ['a DRF field-error body', thrown({ phone: ['Enter a valid phone number.'] })],
    ['an allauth body not wrapped in an error', { status: 403 }],
    ['an error without data', { message: 'Error' }],
    ['an empty object', {}],
    ['an array', []],
    ['null', null],
    ['undefined', undefined],
    ['a string', 'error'],
  ])('rejects %s', (_case, error) => {
    expect(isAllAuthClientError(error)).toBe(false)
  })
})

describe('isRateLimitedClientError', () => {
  it.each([
    ['the Nuxt proxy\'s H3 error', { data: { statusCode: 429 } }],
    ['allauth\'s own 429 body, forwarded', { data: { statusCode: 400, data: { status: 429 } } }],
    ['a createError thrown in the app', { statusCode: 429 }],
  ])('recognises %s', (_case, error) => {
    expect(isRateLimitedClientError(error)).toBe(true)
  })

  it.each([
    ['another status', { statusCode: 400, data: { statusCode: 400, data: { status: 400 } } }],
    ['429 as a string', { statusCode: '429' }],
    ['an error without status', new Error('boom')],
    ['null', null],
    ['a number', 429],
  ])('rejects %s', (_case, error) => {
    expect(isRateLimitedClientError(error)).toBe(false)
  })
})

describe('isConflictClientError', () => {
  it('recognises allauth\'s 409, forwarded under the proxy\'s wrapper', () => {
    expect(isConflictClientError({ data: { statusCode: 409, data: { status: 409 } } })).toBe(true)
  })

  it.each([
    ['another allauth status', { data: { statusCode: 400, data: { status: 400 } } }],
    ['a bare 409 without allauth\'s body', { statusCode: 409 }],
    ['an error without data', new Error('boom')],
    ['null', null],
  ])('rejects %s', (_case, error) => {
    expect(isConflictClientError(error)).toBe(false)
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
    const asked: string[] = []
    const recording = (key: string) => {
      asked.push(key)
      return key
    }

    expect(formatDrfFieldErrors({ firstName: ['Too short.'] }, recording)).toBe('firstName: Too short.')
    expect(asked).toEqual(['form.first_name'])
  })

  it('shows non-field errors bare, with no label to look up', () => {
    // `nonFieldErrors: Passwords do not match.` reads as a broken form.
    const asked: string[] = []
    const recording = (key: string) => {
      asked.push(key)
      return key
    }

    expect(formatDrfFieldErrors({
      nonFieldErrors: ['Passwords do not match.', 'Try again.'],
      detail: ['Throttled.'],
    }, recording)).toBe('Passwords do not match. Try again.\nThrottled.')
    expect(asked).toEqual([])
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
