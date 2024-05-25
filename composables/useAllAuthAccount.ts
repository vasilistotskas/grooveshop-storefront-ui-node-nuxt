import type {
  EmailDeleteBody,
  EmailPatchBody,
  EmailPostBody,
  EmailPutBody,
  PasswordChangeBody,
  ProvidersDeleteBody,
  TotpPostBody,
} from '~/types/all-auth'

const API_BASE_URL = '/api/_allauth/app/v1/account'

export default function () {
  async function getEmailAddresses() {
    return useFetch(`${API_BASE_URL}/email`, {
      method: 'GET',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function addEmailAddress(body: EmailPostBody) {
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'POST',
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
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'PUT',
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
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'PUT',
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
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'DELETE',
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
    return await $fetch(`${API_BASE_URL}/password/change`, {
      method: 'POST',
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
    return useFetch(`${API_BASE_URL}/providers`, {
      method: 'GET',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function disconnectThirdPartyProviderAccount(body: ProvidersDeleteBody) {
    return await $fetch(`${API_BASE_URL}/providers`, {
      method: 'DELETE',
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
    return useFetch(`${API_BASE_URL}/authenticators`, {
      method: 'GET',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function totpAuthenticatorStatus() {
    return useFetch(`${API_BASE_URL}/authenticators/totp`, {
      method: 'GET',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function activateTotp(body: TotpPostBody) {
    return await $fetch(`${API_BASE_URL}/authenticators/totp`, {
      method: 'POST',
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
    return await $fetch(`${API_BASE_URL}/authenticators/totp`, {
      method: 'DELETE',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function recoveryCodes() {
    return useFetch(`${API_BASE_URL}/authenticators/recovery-codes`, {
      method: 'GET',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function generateRecoveryCodes() {
    return await $fetch(`${API_BASE_URL}/authenticators/recovery-codes`, {
      method: 'POST',
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
    recoveryCodes,
    generateRecoveryCodes,
  }
}
