import { describe, expect, it } from 'vitest'
import { builderSessionFailure } from '~~/app/utils/builderSession'

describe('builderSessionFailure', () => {
  it('reads a 401 as no session', () => {
    expect(builderSessionFailure({ statusCode: 401 })).toBe('signedOut')
  })

  it('reads Django\'s invalid_ticket 400 as a refused ticket', () => {
    expect(builderSessionFailure({ statusCode: 400, data: { code: 'invalid_ticket' } })).toBe('invalidTicket')
  })

  it.each([
    ['another 400', { statusCode: 400, data: { code: 'other' } }],
    ['a 400 with no body', { statusCode: 400 }],
    ['an invalid_ticket code on another status', { statusCode: 422, data: { code: 'invalid_ticket' } }],
    ['a server error', { statusCode: 502 }],
    ['an error with no status', new Error('Failed to fetch')],
    ['a string', 'boom'],
    ['nothing', undefined],
    ['null', null],
  ])('reads %s as an error to report', (_, error) => {
    expect(builderSessionFailure(error)).toBe('error')
  })
})
