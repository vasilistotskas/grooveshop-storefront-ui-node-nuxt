import type {
  EmailDeleteBody,
  EmailPatchBody,
  EmailPostBody,
  EmailPutBody,
  PasswordChangeBody,
  ProvidersDeleteBody,
  TotpPostBody, WebAuthnDeleteBody, WebAuthnPostBody, WebAuthnPutBody,
} from '~/types/all-auth'

const API_ACCOUNT_BASE_URL = '/api/_allauth/app/v1/account' as const

export default function () {
  async function getEmailAddresses() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function addEmailAddress(body: EmailPostBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function requestEmailVerification(body: EmailPutBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'PUT',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function changePrimaryEmailAddress(body: EmailPatchBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'PUT',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function removeEmailAddress(body: EmailDeleteBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/email`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function changePassword(body: PasswordChangeBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/password/change`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function connectedThirdPartyProviderAccounts() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/providers`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function disconnectThirdPartyProviderAccount(body: ProvidersDeleteBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/providers`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function getAuthenticators() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function totpAuthenticatorStatus() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/totp/svg`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function activateTotp(body: TotpPostBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/totp`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function deactivateTotp() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/totp`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function getRecoveryCodes() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/recovery-codes`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function generateRecoveryCodes() {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/recovery-codes`, {
      method: 'POST',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function getWebAuthnCreateOptions(passwordless: boolean) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        passwordless,
      },
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function addWebAuthnCredential(body: WebAuthnPostBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function deleteWebAuthnCredential(body: WebAuthnDeleteBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function updateWebAuthnCredential(body: WebAuthnPutBody) {
    return $fetch(`${API_ACCOUNT_BASE_URL}/authenticators/webauthn`, {
      method: 'PUT',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  return {
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
