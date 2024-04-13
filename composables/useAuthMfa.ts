import type {
  MfaRecoveryCodesGenerateBody,
  MfaTotpActivatePostBody,
  MfaTotpAuthenticateBody,
  MfaTotpDeactivateBody,
} from '~/types/auth'

export default function () {
  async function totpActivateGet() {
    return await $fetch('/api/auth/mfa/totp/activate', {
      method: 'GET',
    })
  }

  async function totpActive() {
    return await $fetch('/api/auth/mfa/totp/active', {
      method: 'GET',
    })
  }

  async function recoveryCodesList() {
    return await $fetch('/api/auth/mfa/recovery-codes/list', {
      method: 'GET',
    })
  }

  async function totpAuthenticate(body: MfaTotpAuthenticateBody) {
    return await $fetch('/api/auth/mfa/totp/authenticate', {
      method: 'POST',
      body,
    })
  }

  async function totpDeactivate(body: MfaTotpDeactivateBody) {
    return await $fetch('/api/auth/mfa/totp/deactivate', {
      method: 'POST',
      body,
    })
  }

  async function totpActivatePost(body: MfaTotpActivatePostBody) {
    return await $fetch('/api/auth/mfa/totp/activate', {
      method: 'POST',
      body,
    })
  }

  async function recoveryCodesGenerate(body: MfaRecoveryCodesGenerateBody) {
    return await $fetch('/api/auth/mfa/recovery-codes/generate', {
      method: 'POST',
      body,
    })
  }

  return {
    totpAuthenticate,
    totpDeactivate,
    totpActivateGet,
    totpActivatePost,
    totpActive,
    recoveryCodesGenerate,
    recoveryCodesList,
  }
}
