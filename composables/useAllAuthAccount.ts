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
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'GET',
    })
  }

  async function addEmailAddress(body: EmailPostBody) {
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'POST',
      body,
    })
  }

  async function requestEmailVerification(body: EmailPutBody) {
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'PUT',
      body,
    })
  }

  async function changePrimaryEmailAddress(body: EmailPatchBody) {
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'PUT',
      body,
    })
  }

  async function removeEmailAddress(body: EmailDeleteBody) {
    return await $fetch(`${API_BASE_URL}/email`, {
      method: 'DELETE',
      body,
    })
  }

  async function changePassword(body: PasswordChangeBody) {
    return await $fetch(`${API_BASE_URL}/password/change`, {
      method: 'POST',
      body,
    })
  }

  async function connectedThirdPartyProviderAccounts() {
    return await $fetch(`${API_BASE_URL}/providers`, {
      method: 'GET',
    })
  }

  async function disconnectThirdPartyProviderAccount(body: ProvidersDeleteBody) {
    return await $fetch(`${API_BASE_URL}/providers`, {
      method: 'DELETE',
      body,
    })
  }

  async function authenticators() {
    return await $fetch(`${API_BASE_URL}/authenticators`, {
      method: 'GET',
    })
  }

  async function totpAuthenticatorStatus() {
    return await $fetch(`${API_BASE_URL}/authenticators/totp`, {
      method: 'GET',
    })
  }

  async function activateTotp(body: TotpPostBody) {
    return await $fetch(`${API_BASE_URL}/authenticators/totp`, {
      method: 'POST',
      body,
    })
  }

  async function deactivateTotp() {
    return await $fetch(`${API_BASE_URL}/authenticators/totp`, {
      method: 'DELETE',
    })
  }

  async function recoveryCodes() {
    return await $fetch(`${API_BASE_URL}/recovery_codes`, {
      method: 'GET',
    })
  }

  async function generateRecoveryCodes() {
    return await $fetch(`${API_BASE_URL}/recovery_codes`, {
      method: 'POST',
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
    authenticators,
    totpAuthenticatorStatus,
    activateTotp,
    deactivateTotp,
    recoveryCodes,
    generateRecoveryCodes,
  }
}
