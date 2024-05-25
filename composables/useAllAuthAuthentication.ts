import type {
  CodeConfirmBody,
  CodeRequestBody,
  EmailVerifyPostBody,
  LoginBody,
  PasswordRequestBody,
  PasswordResetPostBody,
  ProviderRedirectBody,
  ProviderSignupBody,
  ProviderTokenBody,
  ReauthenticateBody,
  SignupBody,
  TwoFaAuthenticateBody,
} from '~/types/all-auth'

const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function getSession() {
    return useFetch(`${API_BASE_URL}/session`, {
      method: 'GET',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function deleteSession() {
    return useFetch(`${API_BASE_URL}/session`, {
      method: 'DELETE',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function login(body: LoginBody) {
    return await $fetch(`${API_BASE_URL}/login`, {
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

  async function signup(body: SignupBody) {
    return await $fetch(`${API_BASE_URL}/signup`, {
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

  async function getEmailVerify(key: string) {
    return useFetch(`${API_BASE_URL}/email/verify`, {
      method: 'GET',
      headers: {
        'X-Email-Verification-Key': key,
      },
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function emailVerify(body: EmailVerifyPostBody) {
    return $fetch(`${API_BASE_URL}/email/verify`, {
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

  async function reauthenticate(body: ReauthenticateBody) {
    return await $fetch(`${API_BASE_URL}/reauthenticate`, {
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

  async function passwordRequest(body: PasswordRequestBody) {
    return await $fetch(`${API_BASE_URL}/password/request`, {
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

  async function getPasswordReset(key: string) {
    return useFetch(`${API_BASE_URL}/password/reset`, {
      method: 'GET',
      headers: {
        'X-Password-Reset-Key': key,
      },
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function passwordReset(body: PasswordResetPostBody) {
    return await $fetch(`${API_BASE_URL}/password/reset`, {
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

  async function providerRedirect(body: ProviderRedirectBody) {
    return await $fetch(`${API_BASE_URL}/provider/redirect`, {
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

  async function providerToken(body: ProviderTokenBody) {
    return await $fetch(`${API_BASE_URL}/provider/token`, {
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

  async function providerSignup(body: ProviderSignupBody) {
    return await $fetch(`${API_BASE_URL}/provider/signup`, {
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

  async function twoFaAuthenticate(body: TwoFaAuthenticateBody) {
    return await $fetch(`${API_BASE_URL}/2fa/authenticate`, {
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

  async function twoFaReauthenticate() {
    return await $fetch(`${API_BASE_URL}/2fa/reauthenticate`, {
      method: 'POST',
      async onResponse({ response }) {
        await onAllAuthResponse(response._data)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response._data)
      },
    })
  }

  async function requestLoginCode(body: CodeRequestBody) {
    return await $fetch(`${API_BASE_URL}/code/request`, {
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

  async function confirmLoginCode(body: CodeConfirmBody) {
    return await $fetch(`${API_BASE_URL}/code/confirm`, {
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

  return {
    getSession,
    deleteSession,
    login,
    signup,
    getEmailVerify,
    emailVerify,
    reauthenticate,
    passwordRequest,
    getPasswordReset,
    passwordReset,
    providerRedirect,
    providerToken,
    providerSignup,
    twoFaAuthenticate,
    twoFaReauthenticate,
    requestLoginCode,
    confirmLoginCode,
  }
}
