const API_ACCOUNT_BASE_URL = '/api/_allauth/app/v1/account' as const

export default function () {
  async function getUserAccount(id: number) {
    return $fetch<UserAccount>(`/api/user/account/${id}`, {
      method: 'GET',
      headers: useRequestHeaders(),
    })
  }

  async function getEmailAddresses() {
    return $fetch<EmailGetResponse>(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function addEmailAddress(body: EmailPostBody) {
    return $fetch<EmailPostResponse>(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function requestEmailVerification(body: EmailPutBody) {
    return $fetch<EmailPutResponse>(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'PUT',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function changePrimaryEmailAddress(body: EmailPatchBody) {
    return $fetch<EmailPatchResponse>(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'PATCH',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function removeEmailAddress(body: EmailDeleteBody) {
    return $fetch<EmailDeleteResponse>(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function changePassword(body: PasswordChangeBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/password/change`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function connectedThirdPartyProviderAccounts() {
    return $fetch<ProvidersGetResponse>(`${API_ACCOUNT_BASE_URL}/providers`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function disconnectThirdPartyProviderAccount(body: ProvidersDeleteBody) {
    return $fetch<ProvidersDeleteResponse>(`${API_ACCOUNT_BASE_URL}/providers`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getAuthenticators() {
    return $fetch<AuthenticatorsResponse>(`${API_ACCOUNT_BASE_URL}/authenticators`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function totpAuthenticatorStatus() {
    return $fetch<TotpGetResponse | TotpGetResponseError>(`${API_ACCOUNT_BASE_URL}/authenticators/totp/svg`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function activateTotp(body: TotpPostBody) {
    return $fetch<TotpPostResponse>(`${API_ACCOUNT_BASE_URL}/authenticators/totp`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function deactivateTotp() {
    return $fetch<TotpDeleteResponse>(`${API_ACCOUNT_BASE_URL}/authenticators/totp`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getRecoveryCodes() {
    return $fetch<RecoveryCodesGetResponse>(`${API_ACCOUNT_BASE_URL}/authenticators/recovery-codes`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function generateRecoveryCodes() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/recovery-codes`, {
      method: 'POST',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getWebAuthnCreateOptions(passwordless: boolean) {
    return $fetch<WebAuthnGetResponse>(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        passwordless,
      },
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function addWebAuthnCredential(body: WebAuthnPostBody) {
    return $fetch<WebAuthnPostResponse>(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function deleteWebAuthnCredential(body: WebAuthnDeleteBody) {
    return $fetch<WebAuthnDeleteResponse>(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function updateWebAuthnCredential(body: WebAuthnPutBody) {
    return $fetch<WebAuthnPutResponse>(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'PUT',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  return {
    getUserAccount,
    getEmailAddresses,
    addEmailAddress,
    requestEmailVerification,
    changePrimaryEmailAddress,
    removeEmailAddress,
    changePassword,
    connectedThirdPartyProviderAccounts,
    disconnectThirdPartyProviderAccount,
    getAuthenticators,
    totpAuthenticatorStatus,
    activateTotp,
    deactivateTotp,
    getRecoveryCodes,
    generateRecoveryCodes,
    getWebAuthnCreateOptions,
    addWebAuthnCredential,
    deleteWebAuthnCredential,
    updateWebAuthnCredential,
  }
}
