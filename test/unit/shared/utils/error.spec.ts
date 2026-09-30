import { describe, it, expect } from 'vitest'
import { getErrorDetail, serializeError } from '~~/shared/utils/error'

describe('getErrorDetail', () => {
  it('reads detail from a forwarded upstream body (error.data.detail)', () => {
    expect(getErrorDetail({ data: { detail: 'Username already taken.' } }))
      .toBe('Username already taken.')
  })

  it('reads detail from the thrown-route wrapper (error.data.data.detail)', () => {
    expect(getErrorDetail({ data: { statusCode: 400, data: { detail: 'Bad cart.' } } }))
      .toBe('Bad cart.')
  })

  it('prefers the forwarded body when both carry a detail', () => {
    expect(getErrorDetail({ data: { detail: 'outer', data: { detail: 'inner' } } })).toBe('outer')
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

describe('serializeError', () => {
  it('keeps what a log line needs from an H3-style error', () => {
    expect(serializeError({ message: 'boom', statusCode: 502, statusMessage: 'Bad Gateway', data: { detail: 'x' } }))
      .toEqual({ message: 'boom', statusCode: 502, statusMessage: 'Bad Gateway', data: { detail: 'x' } })
  })

  it('falls back from message to statusMessage, then to a placeholder', () => {
    expect(serializeError({ statusMessage: 'Not Found' }).message).toBe('Not Found')
    expect(serializeError({}).message).toBe('Unknown error')
  })

  it('drops fields of the wrong type rather than logging them as-is', () => {
    expect(serializeError({ message: 'm', statusCode: '500', statusMessage: 7, data: 'text' }))
      .toEqual({ message: 'm', statusCode: undefined, statusMessage: undefined, data: undefined })
  })

  it('stringifies a thrown primitive', () => {
    expect(serializeError('plain')).toEqual({ message: 'plain' })
    expect(serializeError(null)).toEqual({ message: 'null' })
  })
})
