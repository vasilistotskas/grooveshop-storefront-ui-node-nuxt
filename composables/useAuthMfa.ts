import type {
  MfaRecoveryCodesGenerateBody,
  MfaTotpActivatePostBody,
  MfaTotpAuthenticateBody,
  MfaTotpDeactivateBody,
} from '~/types/auth'

export default function () {
  function totpActivateGet() {
    return useFetch('/api/auth/mfa/totp/activate', {
      method: 'GET',
    })
  }

  function totpActive() {
    return useFetch('/api/auth/mfa/totp/active', {
      method: 'GET',
    })
  }

  function recoveryCodesList() {
    return useFetch('/api/auth/mfa/recovery-codes/list', {
      method: 'GET',
    })
  }

  function totpAuthenticate(body: MfaTotpAuthenticateBody) {
    return useFetch('/api/auth/mfa/totp/authenticate', {
      method: 'POST',
      body,
    })
  }

  function totpDeactivate(body: MfaTotpDeactivateBody) {
    return useFetch('/api/auth/mfa/totp/deactivate', {
      method: 'POST',
      body,
    })
  }

  function totpActivatePost(body: MfaTotpActivatePostBody) {
    return useFetch('/api/auth/mfa/totp/activate', {
      method: 'POST',
      body,
    })
  }

  function recoveryCodesGenerate(body: MfaRecoveryCodesGenerateBody) {
    return useFetch('/api/auth/mfa/recovery-codes/generate', {
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
