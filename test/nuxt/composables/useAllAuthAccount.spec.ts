import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('useAllAuthAccount', () => {
  let mockFetch: ReturnType<typeof vi.fn>
  let mockUseRequestHeaders: ReturnType<typeof vi.fn>
  let mockOnAllAuthResponse: ReturnType<typeof vi.fn>
  let mockOnAllAuthResponseError: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockFetch = vi.fn()
    mockUseRequestHeaders = vi.fn(() => ({ 'Content-Type': 'application/json' }))
    mockOnAllAuthResponse = vi.fn()
    mockOnAllAuthResponseError = vi.fn()

    vi.stubGlobal('$fetch', mockFetch)
    vi.stubGlobal('useRequestHeaders', mockUseRequestHeaders)
    vi.stubGlobal('onAllAuthResponse', mockOnAllAuthResponse)
    vi.stubGlobal('onAllAuthResponseError', mockOnAllAuthResponseError)
  })

  describe('getUserAccount', () => {
    it('should get user account by id', async () => {
      const mockResponse = { id: 1, email: 'test@example.com' }
      mockFetch.mockResolvedValue(mockResponse)

      const { getUserAccount } = useAllAuthAccount()
      await getUserAccount(1)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/user/account/1',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })
  })

  describe('email management', () => {
    it('should get email addresses', async () => {
      const mockResponse = { data: [{ email: 'test@example.com', primary: true }] }
      mockFetch.mockResolvedValue(mockResponse)

      const { getEmailAddresses } = useAllAuthAccount()
      await getEmailAddresses()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/email',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should add email address', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { addEmailAddress } = useAllAuthAccount()
      const body = { email: 'new@example.com' }
      await addEmailAddress(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/email',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should request email verification', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { requestEmailVerification } = useAllAuthAccount()
      const body = { email: 'test@example.com' }
      await requestEmailVerification(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/email',
        expect.objectContaining({
          method: 'PUT',
          body,
        }),
      )
    })

    it('should change primary email address', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { changePrimaryEmailAddress } = useAllAuthAccount()
      const body = { email: 'primary@example.com' }
      await changePrimaryEmailAddress(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/email',
        expect.objectContaining({
          method: 'PATCH',
          body,
        }),
      )
    })

    it('should remove email address', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { removeEmailAddress } = useAllAuthAccount()
      const body = { email: 'remove@example.com' }
      await removeEmailAddress(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/email',
        expect.objectContaining({
          method: 'DELETE',
          body,
        }),
      )
    })
  })

  describe('password management', () => {
    it('should change password', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { changePassword } = useAllAuthAccount()
      const body = { current_password: 'old123', new_password: 'new123' }
      await changePassword(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/password/change',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })
  })

  describe('third-party provider management', () => {
    it('should get connected third-party provider accounts', async () => {
      const mockResponse = { data: [{ provider: 'google', uid: '123' }] }
      mockFetch.mockResolvedValue(mockResponse)

      const { connectedThirdPartyProviderAccounts } = useAllAuthAccount()
      await connectedThirdPartyProviderAccounts()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/providers',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should disconnect third-party provider account', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { disconnectThirdPartyProviderAccount } = useAllAuthAccount()
      const body = { provider: 'google', account: '123' }
      await disconnectThirdPartyProviderAccount(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/providers',
        expect.objectContaining({
          method: 'DELETE',
          body,
        }),
      )
    })
  })

  describe('authenticators management', () => {
    it('should get authenticators', async () => {
      const mockResponse = { data: [{ type: 'totp', id: 1 }] }
      mockFetch.mockResolvedValue(mockResponse)

      const { getAuthenticators } = useAllAuthAccount()
      await getAuthenticators()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })
  })

  describe('TOTP management', () => {
    it('should get TOTP authenticator status', async () => {
      const mockResponse = { data: { svg: '<svg>...</svg>' } }
      mockFetch.mockResolvedValue(mockResponse)

      const { totpAuthenticatorStatus } = useAllAuthAccount()
      await totpAuthenticatorStatus()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/totp/svg',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should activate TOTP', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { activateTotp } = useAllAuthAccount()
      const body = { code: '123456' }
      await activateTotp(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/totp',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should deactivate TOTP', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { deactivateTotp } = useAllAuthAccount()
      await deactivateTotp()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/totp',
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })

  describe('recovery codes management', () => {
    it('should get recovery codes', async () => {
      const mockResponse = { data: { codes: ['code1', 'code2'] } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getRecoveryCodes } = useAllAuthAccount()
      await getRecoveryCodes()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/recovery-codes',
        expect.objectContaining({
          method: 'GET',
        }),
      )
    })

    it('should generate recovery codes', async () => {
      const mockResponse = { data: { codes: ['new1', 'new2'] } }
      mockFetch.mockResolvedValue(mockResponse)

      const { generateRecoveryCodes } = useAllAuthAccount()
      await generateRecoveryCodes()

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/recovery-codes',
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })
  })

  describe('WebAuthn management', () => {
    it('should get WebAuthn create options with passwordless true', async () => {
      const mockResponse = { data: { challenge: 'challenge123' } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getWebAuthnCreateOptions } = useAllAuthAccount()
      await getWebAuthnCreateOptions(true)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/webauthn',
        expect.objectContaining({
          method: 'GET',
          query: { passwordless: true },
        }),
      )
    })

    it('should get WebAuthn create options with passwordless false', async () => {
      const mockResponse = { data: { challenge: 'challenge123' } }
      mockFetch.mockResolvedValue(mockResponse)

      const { getWebAuthnCreateOptions } = useAllAuthAccount()
      await getWebAuthnCreateOptions(false)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/webauthn',
        expect.objectContaining({
          method: 'GET',
          query: { passwordless: false },
        }),
      )
    })

    it('should add WebAuthn credential', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { addWebAuthnCredential } = useAllAuthAccount()
      const body = { credential: 'webauthn-credential', name: 'My Key' }
      await addWebAuthnCredential(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/webauthn',
        expect.objectContaining({
          method: 'POST',
          body,
        }),
      )
    })

    it('should delete WebAuthn credential', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { deleteWebAuthnCredential } = useAllAuthAccount()
      const body = { id: 1 }
      await deleteWebAuthnCredential(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/webauthn',
        expect.objectContaining({
          method: 'DELETE',
          body,
        }),
      )
    })

    it('should update WebAuthn credential', async () => {
      const mockResponse = { status: 200 }
      mockFetch.mockResolvedValue(mockResponse)

      const { updateWebAuthnCredential } = useAllAuthAccount()
      const body = { id: 1, name: 'Updated Key' }
      await updateWebAuthnCredential(body)

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/_allauth/app/v1/account/authenticators/webauthn',
        expect.objectContaining({
          method: 'PUT',
          body,
        }),
      )
    })
  })
})
