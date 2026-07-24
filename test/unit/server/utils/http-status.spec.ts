import { describe, expect, it } from 'vitest'

import { isClientError } from '../../../../server/utils/http-status'

describe('isClientError', () => {
  it('treats 4xx as client errors (→ warn)', () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429, 499]) {
      expect(isClientError({ statusCode: status })).toBe(true)
    }
  })

  it('does not treat 5xx as client errors (stays error)', () => {
    for (const status of [500, 502, 503, 504]) {
      expect(isClientError({ statusCode: status })).toBe(false)
    }
  })

  it('reads the `status` field as a fallback', () => {
    expect(isClientError({ status: 404 })).toBe(true)
    expect(isClientError({ status: 500 })).toBe(false)
  })

  it('is false for 2xx/3xx and missing/non-numeric status', () => {
    expect(isClientError({ statusCode: 200 })).toBe(false)
    expect(isClientError({ statusCode: 302 })).toBe(false)
    expect(isClientError({})).toBe(false)
    expect(isClientError(null)).toBe(false)
    expect(isClientError(undefined)).toBe(false)
    expect(isClientError({ statusCode: '404' })).toBe(false)
  })
})
