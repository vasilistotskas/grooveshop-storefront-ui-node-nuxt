export default function () {
  const API_ACCOUNT_BASE_URL = ALLAUTH_ACCOUNT_URL
  async function getUserAccount(id: number) {
    return $api(`/api/user/account/${id}`, {
      method: 'GET',
      headers: useRequestHeaders(),
    })
  }

  async function getEmailAddresses() {
    return $api(`${API_ACCOUNT_BASE_URL}/email`, {
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

  async function addEmailAddress(body: AllAuthRequestEmail) {
    return $api(`${API_ACCOUNT_BASE_URL}/email`, {
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

  async function requestEmailVerification(body: AllAuthRequestEmail) {
    return $api(`${API_ACCOUNT_BASE_URL}/email`, {
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

  async function changePrimaryEmailAddress(body: AllAuthRequestMarkPrimaryEmail) {
    return $api(`${API_ACCOUNT_BASE_URL}/email`, {
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

  async function removeEmailAddress(body: AllAuthRequestEmail) {
    return $api(`${API_ACCOUNT_BASE_URL}/email`, {
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

  async function changePassword(body: AllAuthRequestChangePassword) {
    return $api(`${API_ACCOUNT_BASE_URL}/password/change`, {
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
    return $api(`${API_ACCOUNT_BASE_URL}/providers`, {
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

  async function disconnectThirdPartyProviderAccount(body: AllAuthRequestProviderAccount) {
    return $api(`${API_ACCOUNT_BASE_URL}/providers`, {
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
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators`, {
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
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/totp/svg`, {
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

  async function activateTotp(body: AllAuthRequestSetupTotp) {
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/totp`, {
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
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/totp`, {
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
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/recovery-codes`, {
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
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/recovery-codes`, {
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
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
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

  async function addWebAuthnCredential(body: AllAuthRequestAddWebAuthnAuthenticator) {
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
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

  async function deleteWebAuthnCredential(body: AllAuthRequestDeleteWebAuthn) {
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
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

  async function updateWebAuthnCredential(body: AllAuthRequestUpdateWebAuthn) {
    return $api(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
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
