import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'

describe('useAllAuthAuthentication', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let mockUseRequestHeaders: ReturnType<typeof vi.fn>
  let mockOnAllAuthResponse: ReturnType<typeof vi.fn>
  let mockOnAllAuthResponseError: ReturnType<typeof vi.fn>

  beforeAll(() => {
    mockFetch = vi.fn()
    mockUseRequestHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }))
    mockOnAllAuthResponse = vi.fn()
    mockOnAllAuthResponseError = vi.fn()

    vi.stubGlobal('$fetch', mockFetch)
    vi.stubGlobal('useRequestHeaders', mockUseRequestHeaders)
    vi.stubGlobal('onAllAuthResponse', mockOnAllAuthResponse)
    vi.stubGlobal('onAllAuthResponseError', mockOnAllAuthResponseError)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  beforeEach(() => {
    mockFetch.mockClear()
    mockUseRequestHeaders.mockClear()
    mockOnAllAuthResponse.mockClear()
    mockOnAllAuthResponseError.mockClear()
  })

  describe('getSession', () => {
    it('should fetch session without encrypted token', async () => {
      const mockResponse = { status: 200, data: { user: { email: 'test@example.com' } } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getSession } = useAllAuthAuthentication()
      await getSession()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/session',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should fetch session with encrypted token', async () => {
      const mockResponse = { status: 200, data: { user: { email: 'test@example.com' } } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getSession } = useAllAuthAuthentication()
      await getSession('encrypted-token-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/session',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Encrypted-Token': 'encrypted-token-123',
          }),
        }),
      )
    })
  })

  describe('deleteSession', () => {
    it('should delete session', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { deleteSession } = useAllAuthAuthentication()
      await deleteSession()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/session',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })

  describe('login', () => {
    it('should login with email and password', async () => {
      const mockResponse = { status: 200, data: { user: { email: 'test@example.com' } } }
      mockFetch.mockResolvedValue(mockResponse)

      const { login } = useAllAuthAuthentication()
      const body = { email: 'test@example.com', password: 'password123' }
      await login(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('signup', () => {
    it('should signup with email and password', async () => {
      const mockResponse = { status: 200, data: { user: { email: 'new@example.com' } } }
      mockFetch.mockResolvedValue(mockResponse)

      const { signup } = useAllAuthAuthentication()
      const body = { email: 'new@example.com', password: 'password123' }
      await signup(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/signup',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('email verification', () => {
    it('should get email verification status', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { getEmailVerify } = useAllAuthAuthentication()
      await getEmailVerify('verification-key-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/email/verify',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Email-Verification-Key': 'verification-key-123',
          }),
        }),
      )
    })

    it('should verify email with key', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { emailVerify } = useAllAuthAuthentication()
      const body = { key: 'verification-key-123' }
      await emailVerify(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/email/verify',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('reauthenticate', () => {
    it('should reauthenticate with password', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { reauthenticate } = useAllAuthAuthentication()
      const body = { password: 'password123' }
      await reauthenticate(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/reauthenticate',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('password reset', () => {
    it('should request password reset', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { passwordRequest } = useAllAuthAuthentication()
      const body = { email: 'test@example.com' }
      await passwordRequest(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/password/request',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should get password reset status', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { getPasswordReset } = useAllAuthAuthentication()
      await getPasswordReset('reset-key-123')

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/password/reset',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'X-Password-Reset-Key': 'reset-key-123',
          }),
        }),
      )
    })

    it('should reset password with key', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { passwordReset } = useAllAuthAuthentication()
      const body = { key: 'reset-key-123', password: 'newpassword123' }
      await passwordReset(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/password/reset',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('provider authentication', () => {
    it('should handle provider token', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { providerToken } = useAllAuthAuthentication()
      const body = {
        provider: 'google',
        process: 'login' as const,
        token: {
          client_id: 'google-client-id',
          access_token: 'google-token-123',
        },
      }
      await providerToken(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/provider/token',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should handle provider signup', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { providerSignup } = useAllAuthAuthentication()
      const body = { provider: 'google', email: 'test@example.com' }
      await providerSignup(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/provider/signup',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('2FA authentication', () => {
    it('should authenticate with 2FA code', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { twoFaAuthenticate } = useAllAuthAuthentication()
      const body = { code: '123456' }
      await twoFaAuthenticate(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/2fa/authenticate',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should reauthenticate with 2FA code', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { twoFaReauthenticate } = useAllAuthAuthentication()
      const body = { code: '123456' }
      await twoFaReauthenticate(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/2fa/reauthenticate',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('MFA login flow', () => {
    // NOTE: The global $fetch mock (vi.fn()) does NOT invoke ofetch's
    // onResponse / onResponseError callbacks — those are real ofetch
    // internals that only run with the real implementation.
    // Therefore these tests only verify:
    //   (a) the correct endpoint + method + body are sent for each MFA step
    //   (b) the composable returns the $fetch result unchanged
    //
    // Behavioral coverage (onAllAuthResponseError fired, Knox token persisted,
    // auth:change hook called) requires integration-level testing with a real
    // backend or a full ofetch mock that invokes the hooks — deferred.

    it('login with MFA-required user sends credentials to the login endpoint', async () => {
      // allauth returns 401 with pending_flow=mfa when the user has TOTP enabled.
      // The composable's job is to POST the credentials; the 401 handling
      // (routing to MFA page) is done by the auth plugin via auth:change hook.
      const mfaPendingResponse = {
        status: 401,
        data: {
          flows: [{ id: 'mfa', is_pending: true, types: ['totp'] }],
        },
        meta: { is_authenticated: false },
      }
      mockFetch.mockResolvedValueOnce(mfaPendingResponse)

      const { login } = useAllAuthAuthentication()
      const result = await login({ email: 'mfa-user@example.com', password: 'password123' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: { email: 'mfa-user@example.com', password: 'password123' },
        }),
      )
      // The composable returns the raw 401 response for the caller to handle
      expect(result).toMatchObject({ status: 401 })
    })

    it('MFA code submission sends the code to the 2FA authenticate endpoint', async () => {
      // After login returns a pending MFA flow, the user enters their TOTP code.
      // The composable POSTs to /2fa/authenticate with the code.
      // On success, allauth returns 200 with meta.access_token (Knox token).
      const successResponse = {
        status: 200,
        meta: { is_authenticated: true, access_token: 'knox-token-abc' },
        data: { user: { id: 1, email: 'mfa-user@example.com' } },
      }
      mockFetch.mockResolvedValueOnce(successResponse)

      const { twoFaAuthenticate } = useAllAuthAuthentication()
      const result = await twoFaAuthenticate({ code: '654321' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/2fa/authenticate',
        expect.objectContaining({
          method: 'POST',
          body: { code: '654321' },
        }),
      )
      // The composable returns the raw $fetch result; Knox token storage
      // is handled downstream by onAllAuthResponse → auth:change → session.
      expect(result).toMatchObject({
        status: 200,
        meta: expect.objectContaining({ is_authenticated: true }),
      })
    })

    it('invalid MFA code — $fetch is called with the wrong code and returns a non-200 response', async () => {
      // allauth returns 400 for a wrong TOTP code. The composable forwards
      // the response. Rate-limit semantics (whether allauth counts this attempt
      // against a Redis counter) are not testable without a real backend.
      const invalidCodeResponse = {
        status: 400,
        errors: [{ code: 'enter_a_valid_code', param: 'code' }],
      }
      mockFetch.mockResolvedValueOnce(invalidCodeResponse)

      const { twoFaAuthenticate } = useAllAuthAuthentication()
      const result = await twoFaAuthenticate({ code: '000000' })

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/2fa/authenticate',
        expect.objectContaining({
          method: 'POST',
          body: { code: '000000' },
        }),
      )
      expect(result).toMatchObject({ status: 400 })
    })
  })

  describe('code-based login', () => {
    it('should request login code', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { requestLoginCode } = useAllAuthAuthentication()
      const body = { email: 'test@example.com' }
      await requestLoginCode(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/code/request',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should confirm login code', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { confirmLoginCode } = useAllAuthAuthentication()
      const body = { code: '123456' }
      await confirmLoginCode(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/code/confirm',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('WebAuthn authentication', () => {
    const mockWebAuthnCredential = {
      type: 'public-key',
      id: 'credential-id',
      rawId: 'raw-id',
      response: {
        clientDataJSON: 'client-data',
        authenticatorData: 'auth-data',
        signature: 'signature',
        userHandle: 'user-handle',
      },
    }

    it('should get WebAuthn options for login', async () => {
      const mockResponse = { status: 200, data: { challenge: 'challenge-123' } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getWebAuthnRequestOptionsForLogin } = useAllAuthAuthentication()
      await getWebAuthnRequestOptionsForLogin()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/login',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should login using WebAuthn', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { loginUsingWebAuthn } = useAllAuthAuthentication()
      const body = { credential: mockWebAuthnCredential }
      await loginUsingWebAuthn(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/login',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should get WebAuthn options for authentication', async () => {
      const mockResponse = { status: 200, data: { challenge: 'challenge-123' } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getWebAuthnRequestOptionsForAuthentication } = useAllAuthAuthentication()
      await getWebAuthnRequestOptionsForAuthentication()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/authenticate',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should authenticate using WebAuthn', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { authenticateUsingWebAuthn } = useAllAuthAuthentication()
      const body = { credential: mockWebAuthnCredential }
      await authenticateUsingWebAuthn(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/authenticate',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should get WebAuthn options for reauthentication', async () => {
      const mockResponse = { status: 200, data: { challenge: 'challenge-123' } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getWebAuthnRequestOptionsForReauthentication } = useAllAuthAuthentication()
      await getWebAuthnRequestOptionsForReauthentication()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/reauthenticate',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should reauthenticate using WebAuthn', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { reauthenticateUsingWebAuthn } = useAllAuthAuthentication()
      const body = { credential: mockWebAuthnCredential }
      await reauthenticateUsingWebAuthn(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/reauthenticate',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should get WebAuthn create options at signup', async () => {
      const mockResponse = { status: 200, data: { challenge: 'challenge-123' } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getWebAuthnCreateOptionsAtSignup } = useAllAuthAuthentication()
      await getWebAuthnCreateOptionsAtSignup()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/signup',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should signup by passkey', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { signUpByPasskey } = useAllAuthAuthentication()
      const body = {
        credential: {
          type: 'public-key',
          id: 'credential-id',
          rawId: 'raw-id',
          response: {},
        },
        email: 'test@example.com',
      }
      await signUpByPasskey(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/signup',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should signup WebAuthn credential', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { signupWebAuthnCredential } = useAllAuthAuthentication()
      const body = {
        name: 'My Passkey',
        credential: {
          type: 'public-key',
          id: 'credential-id',
          rawId: 'raw-id',
          response: {},
        },
      }
      await signupWebAuthnCredential(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/auth/webauthn/signup',
        expect.objectContaining({
          method: 'PUT',
          body,
        }),
      )
    })
  })
})
