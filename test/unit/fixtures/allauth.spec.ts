import { describe, expect, it } from 'vitest'

import {
  zAllAuthAuthenticatedResponse,
  zAllAuthAuthenticationResponse,
  zAllAuthAuthenticatorList,
  zAllAuthEmailAddress,
  zAllAuthErrorResponse,
  zAllAuthProvider,
  zAllAuthProviderAccount,
  zAllAuthSession,
  zGetAllauthAppV1ConfigResponse,
} from '~~/shared/openapi-allauth/zod.gen'
import { extractAllAuthError } from '~/utils/auth'
import {
  asProxiedError,
  makeAllAuthConfig,
  makeAllAuthSession,
  makeAuthenticator,
  makeBadResponse,
  makeEmailAddress,
  makePendingFlowResponse,
  makeProviderAccount,
  makeSessionResponse,
  makeSocialProvider,
} from '~~/test/fixtures/allauth'
import { problems } from '~~/test/unit/fixtures/strictSchema'

/**
 * The allauth builders replace the session, pending-flow, 400 and
 * `/config` literals the auth-form and auth-store specs each spelled
 * out. Parsed strictly against the schemas generated from allauth's document, so a body
 * allauth cannot send fails here and names its field.
 */
describe('allauth fixtures', () => {
  it.each([
    ['makeSessionResponse', zAllAuthAuthenticatedResponse, makeSessionResponse()],
    ['makeSessionResponse with a passwordless user', zAllAuthAuthenticatedResponse, makeSessionResponse({ user: { id: 1, has_usable_password: false }, methods: [] })],
    ['makePendingFlowResponse', zAllAuthAuthenticationResponse, makePendingFlowResponse('verify_email')],
    ['makePendingFlowResponse for MFA', zAllAuthAuthenticationResponse, makePendingFlowResponse('mfa_authenticate', { types: ['totp'] })],
    ['makeBadResponse', zAllAuthErrorResponse, makeBadResponse({ code: 'email_taken', param: 'email', message: 'Taken.' })],
    ['makeAllAuthConfig', zGetAllauthAppV1ConfigResponse, makeAllAuthConfig()],
    ['makeAuthenticator(totp)', zAllAuthAuthenticatorList.element, makeAuthenticator('totp')],
    ['makeAuthenticator(webauthn)', zAllAuthAuthenticatorList.element, makeAuthenticator('webauthn')],
    ['makeAuthenticator(recovery_codes)', zAllAuthAuthenticatorList.element, makeAuthenticator('recovery_codes')],
    ['makeAllAuthSession', zAllAuthSession, makeAllAuthSession()],
    ['makeEmailAddress', zAllAuthEmailAddress, makeEmailAddress()],
    ['makeSocialProvider', zAllAuthProvider, makeSocialProvider()],
    ['makeProviderAccount', zAllAuthProviderAccount, makeProviderAccount()],
  ] as const)('%s parses strictly', (_name, schema, value) => {
    expect(problems(schema, value)).toEqual([])
  })

  it('merges user overrides into the default user and signs them in by password', () => {
    expect(makeSessionResponse({ user: { id: 1 } }).data).toEqual({
      user: { id: 1, display: 'Shopper', email: 'shopper@example.com', has_usable_password: true },
      methods: [{ method: 'password', at: 1_767_225_600, email: 'shopper@example.com' }],
    })
  })

  it('gives each second factor only the fields of its own type', () => {
    expect(makeAuthenticator('totp')).toEqual({ type: 'totp', created_at: 1_767_225_600, last_used_at: null })
    expect(makeAuthenticator('recovery_codes', { unused_code_count: 2 })).toMatchObject({ total_code_count: 10, unused_code_count: 2 })
  })

  it('merges provider overrides into the provider of the linked account', () => {
    expect(makeProviderAccount({ provider: { id: 'facebook', name: 'Facebook' } }).provider)
      .toEqual({ id: 'facebook', name: 'Facebook', client_id: 'google-client-id', flows: ['provider_redirect', 'provider_token'] })
  })

  it('wraps a body where the app reads a proxied allauth error from', () => {
    const body = makePendingFlowResponse('login_by_code')

    expect(asProxiedError(body)).toMatchObject({ statusCode: 401, data: { statusCode: 401 } })
    expect(extractAllAuthError(asProxiedError(body))).toBe(body)
  })
})
