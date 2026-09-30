import { describe, expect, it } from 'vitest'

import { ZodBadResponse } from '~~/shared/schemas/error/all-auth/400'
import { ZodNotAuthenticatedResponse } from '~~/shared/schemas/error/all-auth/401'
import { ZodSessionResponse } from '~~/shared/schemas/response/all-auth/auth/session'
import { ZodConfigResponse } from '~~/shared/schemas/response/all-auth/config'
import { extractAllAuthError } from '~/utils/auth'
import {
  asProxiedError,
  makeAllAuthConfig,
  makeBadResponse,
  makePendingFlowResponse,
  makeSessionResponse,
} from '~~/test/fixtures/allauth'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The allauth builders replace the session, pending-flow, 400 and
 * `/config` literals the auth-form and auth-store specs each spelled
 * out. Parsed strictly against the app's own allauth schemas, so a body
 * allauth cannot send fails here and names its field.
 */
describe('allauth fixtures', () => {
  it.each([
    ['makeSessionResponse', ZodSessionResponse, makeSessionResponse()],
    ['makeSessionResponse with a passwordless user', ZodSessionResponse, makeSessionResponse({ user: { id: 1, has_usable_password: false }, methods: [] })],
    ['makePendingFlowResponse', ZodNotAuthenticatedResponse, makePendingFlowResponse('verify_email')],
    ['makePendingFlowResponse for MFA', ZodNotAuthenticatedResponse, makePendingFlowResponse('mfa_authenticate', { types: ['totp'] })],
    ['makeBadResponse', ZodBadResponse, makeBadResponse({ code: 'email_taken', param: 'email', message: 'Taken.' })],
    ['makeAllAuthConfig', ZodConfigResponse, makeAllAuthConfig()],
  ] as const)('%s parses strictly', (_name, schema, value) => {
    expect(problems(schema, value)).toEqual([])
  })

  it('merges user overrides into the default user and signs them in by password', () => {
    expect(makeSessionResponse({ user: { id: 1 } }).data).toEqual({
      user: { id: 1, email: 'shopper@example.com', has_usable_password: true },
      methods: [{ method: 'password', at: 1_767_225_600, email: 'shopper@example.com' }],
    })
  })

  it('wraps a body where the app reads a proxied allauth error from', () => {
    const body = makePendingFlowResponse('login_by_code')

    expect(asProxiedError(body)).toMatchObject({ statusCode: 401, data: { statusCode: 401 } })
    expect(extractAllAuthError(asProxiedError(body))).toBe(body)
  })
})
