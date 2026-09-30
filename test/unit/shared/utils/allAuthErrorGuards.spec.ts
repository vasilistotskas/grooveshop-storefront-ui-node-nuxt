import { describe, it, expect } from 'vitest'
import {
  isBadResponseError,
  isConflictResponseError,
  isForbiddenResponseError,
  isInvalidSessionResponseError,
  isNotAuthenticatedResponseError,
  isNotFoundResponseError,
} from '~~/shared/utils/allAuthErrorGuards'

/**
 * Which allauth answer a failed request carried decides what the shopper
 * is shown: a field error, a "verify your email" step, an expired
 * session. Each guard reads the body at `error.data` and must accept
 * exactly its own status's shape — a guard that also matched another
 * status would route that error down the wrong branch of
 * `handleAllAuthClientError`.
 */
const unauthenticated = { is_authenticated: false }

const BODIES = {
  400: { status: 400, errors: [{ code: 'invalid', param: 'email', message: 'Invalid e-mail.' }] },
  401: { status: 401, data: { flows: [{ id: 'verify_email', is_pending: true }] }, meta: unauthenticated },
  403: { status: 403 },
  404: { status: 404, meta: { secret: 's' } },
  409: { status: 409 },
  410: { status: 410, data: { flows: [] }, meta: unauthenticated },
} as const

const GUARDS = [
  ['isBadResponseError', isBadResponseError, 400],
  ['isNotAuthenticatedResponseError', isNotAuthenticatedResponseError, 401],
  ['isForbiddenResponseError', isForbiddenResponseError, 403],
  ['isNotFoundResponseError', isNotFoundResponseError, 404],
  ['isConflictResponseError', isConflictResponseError, 409],
  ['isInvalidSessionResponseError', isInvalidSessionResponseError, 410],
] as const

describe.each(GUARDS)('%s', (_name, guard, status) => {
  it(`accepts the ${status} body at error.data`, () => {
    expect(guard({ data: BODIES[status] })).toBe(true)
  })

  it('rejects every other status\'s body', () => {
    const others = Object.entries(BODIES).filter(([code]) => Number(code) !== status)
    expect(others.filter(([, body]) => guard({ data: body })).map(([code]) => code)).toEqual([])
  })

  it.each([
    ['the body itself, not wrapped in an error', BODIES[status]],
    ['an error without data', new Error('boom')],
    ['nothing', undefined],
    ['a string', 'error'],
  ])('rejects %s', (_case, error) => {
    expect(guard(error)).toBe(false)
  })
})

// 403 and 409 are nothing but a status, so a bare `{ status }` IS their
// shape; every other guard must insist on the rest of its body.
describe.each(GUARDS.filter(([, , status]) => status !== 403 && status !== 409))('%s', (_name, guard, status) => {
  it('rejects a body that has the status but not the rest of the shape', () => {
    expect(guard({ data: { status } })).toBe(false)
  })
})
