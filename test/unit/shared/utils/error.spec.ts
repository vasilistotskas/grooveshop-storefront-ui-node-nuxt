import { describe, it, expect } from 'vitest'
import { requestIdOf, serializeError } from '~~/shared/utils/error'

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

describe('requestIdOf', () => {
  const failed = (id: string | null) => ({ response: { headers: new Headers(id ? { 'x-request-id': id } : {}) } })

  it('reads the id off a failed response (ofetch FetchError.response)', () => {
    expect(requestIdOf(failed('9f1c-aa'))).toBe('9f1c-aa')
  })

  it.each([
    ['a response without one', failed(null)],
    ['an error with no response', new Error('offline')],
    ['a response with no headers', { response: {} }],
    ['a primitive', 'boom'],
    ['null', null],
  ])('is undefined for %s', (_label, error) => {
    expect(requestIdOf(error)).toBeUndefined()
  })
})
