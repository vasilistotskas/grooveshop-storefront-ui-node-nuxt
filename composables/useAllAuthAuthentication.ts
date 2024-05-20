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
import { isErrorWithNestedData } from '~/utils/error'

const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function getSession() {
    return useFetch(`${API_BASE_URL}/session`, {
      method: 'GET',
    })
  }

  async function deleteSession() {
    return useFetch(`${API_BASE_URL}/session`, {
      method: 'DELETE',
    })
  }

  async function login(body: LoginBody) {
    try {
      return await $fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        body,
      })
    }
    catch (error) {
      if (!isErrorWithNestedData(error)) {
        throw error
      }
      const { data } = error.data.data

      if (data && data.flows) {
        for (const flow of data.flows) {
          if (flow.id === 'mfa_authenticate' && flow.is_pending) {
            await navigateTo('/account/2fa/authenticate')
            return
          }
        }
      }
    }
  }

  async function signup(body: SignupBody) {
    return await $fetch(`${API_BASE_URL}/signup`, {
      method: 'POST',
      body,
    })
  }

  async function getEmailVerify(key: string) {
    return useFetch(`${API_BASE_URL}/email/verify`, {
      method: 'GET',
      headers: {
        'X-Email-Verification-Key': key,
      },
    })
  }

  async function emailVerify(body: EmailVerifyPostBody) {
    return useFetch(`${API_BASE_URL}/email/verify`, {
      method: 'POST',
      body,
    })
  }

  async function reauthenticate(body: ReauthenticateBody) {
    return await $fetch(`${API_BASE_URL}/reauthenticate`, {
      method: 'POST',
      body,
    })
  }

  async function passwordRequest(body: PasswordRequestBody) {
    return await $fetch(`${API_BASE_URL}/password/request`, {
      method: 'POST',
      body,
    })
  }

  async function getPasswordReset() {
    return await $fetch(`${API_BASE_URL}/password/reset`, {
      method: 'GET',
    })
  }

  async function passwordReset(body: PasswordResetPostBody) {
    return await $fetch(`${API_BASE_URL}/password/reset`, {
      method: 'POST',
      body,
    })
  }

  async function providerRedirect(body: ProviderRedirectBody) {
    return await $fetch(`${API_BASE_URL}/provider/redirect`, {
      method: 'POST',
      body,
    })
  }

  async function providerToken(body: ProviderTokenBody) {
    return await $fetch(`${API_BASE_URL}/provider/token`, {
      method: 'POST',
      body,
    })
  }

  async function providerSignup(body: ProviderSignupBody) {
    return await $fetch(`${API_BASE_URL}/provider/signup`, {
      method: 'POST',
      body,
    })
  }

  async function twoFaAuthenticate(body: TwoFaAuthenticateBody) {
    return await $fetch(`${API_BASE_URL}/2fa/authenticate`, {
      method: 'POST',
      body,
    })
  }

  async function twoFaReauthenticate() {
    return await $fetch(`${API_BASE_URL}/2fa/reauthenticate`, {
      method: 'POST',
    })
  }

  async function codeRequest(body: CodeRequestBody) {
    return await $fetch(`${API_BASE_URL}/code/request`, {
      method: 'POST',
      body,
    })
  }

  async function codeConfirm(body: CodeConfirmBody) {
    return await $fetch(`${API_BASE_URL}/code/confirm`, {
      method: 'POST',
      body,
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
    codeRequest,
    codeConfirm,
  }
}
