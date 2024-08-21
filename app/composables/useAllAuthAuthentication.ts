import { resolveURL, withQuery } from 'ufo'
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
  TwoFaReauthenticateBody, WebAuthnAuthenticatePostBody, WebAuthnLoginPostBody, WebAuthnReauthenticatePostBody,
} from '~/types/all-auth'

const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function getSession() {
    return $fetch(`${API_BASE_URL}/session`, {
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

  async function deleteSession() {
    return await $fetch(`${API_BASE_URL}/session`, {
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

  async function login(body: LoginBody) {
    return await $fetch(`${API_BASE_URL}/login`, {
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

  async function signup(body: SignupBody) {
    return await $fetch(`${API_BASE_URL}/signup`, {
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

  async function getEmailVerify(key: string) {
    return $fetch(`${API_BASE_URL}/email/verify`, {
      method: 'GET',
      headers: {
        ...useRequestHeaders(),
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

  async function reauthenticate(body: ReauthenticateBody) {
    return await $fetch(`${API_BASE_URL}/reauthenticate`, {
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

  async function passwordRequest(body: PasswordRequestBody) {
    return await $fetch(`${API_BASE_URL}/password/request`, {
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

  async function getPasswordReset(key: string) {
    return $fetch(`${API_BASE_URL}/password/reset`, {
      method: 'GET',
      headers: {
        ...useRequestHeaders(),
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

  function providerRedirect(provider: ProviderRedirectBody['provider']): void {
    if (import.meta.client) {
      const route = useRoute()

      const returnToPath = route.query.redirect?.toString()

      let redirectUrl = resolveURL('/auth', provider)

      redirectUrl = withQuery(redirectUrl, { redirect: returnToPath })

      window.location.replace(redirectUrl)
    }
  }

  async function providerToken(body: ProviderTokenBody) {
    return await $fetch(`${API_BASE_URL}/provider/token`, {
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

  async function providerSignup(body: ProviderSignupBody) {
    return await $fetch(`${API_BASE_URL}/provider/signup`, {
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

  async function twoFaAuthenticate(body: TwoFaAuthenticateBody) {
    return await $fetch(`${API_BASE_URL}/2fa/authenticate`, {
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

  async function twoFaReauthenticate(body: TwoFaReauthenticateBody) {
    return await $fetch(`${API_BASE_URL}/2fa/reauthenticate`, {
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

  async function requestLoginCode(body: CodeRequestBody) {
    return await $fetch(`${API_BASE_URL}/code/request`, {
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

  async function confirmLoginCode(body: CodeConfirmBody) {
    return await $fetch(`${API_BASE_URL}/code/confirm`, {
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

  async function getWebAuthnRequestOptionsForReauthentication() {
    return await $fetch(`${API_BASE_URL}/webauthn/reauthenticate`, {
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

  async function reauthenticateUsingWebAuthn(body: WebAuthnReauthenticatePostBody) {
    return await $fetch(`${API_BASE_URL}/webauthn/reauthenticate`, {
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

  async function authenticateUsingWebAuthn(body: WebAuthnAuthenticatePostBody) {
    return await $fetch(`${API_BASE_URL}/webauthn/authenticate`, {
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

  async function loginUsingWebAuthn(body: WebAuthnLoginPostBody) {
    return await $fetch(`${API_BASE_URL}/webauthn/login`, {
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

  async function getWebAuthnRequestOptionsForLogin() {
    return await $fetch(`${API_BASE_URL}/webauthn/login`, {
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

  async function getWebAuthnRequestOptionsForAuthentication() {
    return await $fetch(`${API_BASE_URL}/webauthn/authenticate`, {
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
    getWebAuthnRequestOptionsForReauthentication,
    reauthenticateUsingWebAuthn,
    authenticateUsingWebAuthn,
    loginUsingWebAuthn,
    getWebAuthnRequestOptionsForLogin,
    getWebAuthnRequestOptionsForAuthentication,
  }
}
