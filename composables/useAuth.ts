import { resolveURL, withQuery } from 'ufo'

import type {
  LoginBody,
  LogoutBody,
  PasswordChangeBody,
  PasswordResetBody,
  PasswordResetConfirmBody,
  RegistrationBody,
  RegistrationResendEmailBody,
  RegistrationVerifyEmailBody,
  SocialAccountDisconnectBody,
  TokenRefreshBody,
  TokenVerifyBody,
} from '~/types/auth'

export default function () {
  async function socialAccounts() {
    return await $fetch('/api/auth/social-accounts', {
      method: 'GET',
    })
  }

  async function fetchUser() {
    return await $fetch('/api/auth/user', {
      method: 'GET',
    })
  }

  /**
   * Login with email/password
   */
  async function login(body: LoginBody) {
    return await $fetch('/api/auth/login', {
      method: 'POST',
      body,
    })
  }

  /**
   * Login via oauth provider
   */
  function loginWithProvider(provider: string): void {
    if (import.meta.client) {
      const route = useRoute()

      // The protected page the user has visited before redirect to login page
      const returnToPath = route.query.redirect?.toString()

      let redirectUrl = resolveURL('/api/auth/login', provider)

      redirectUrl = withQuery(redirectUrl, { redirect: returnToPath })

      window.location.replace(redirectUrl)
    }
  }

  async function logout(body?: LogoutBody) {
    return await $fetch('/api/auth/logout', {
      method: 'POST',
      body,
    })
  }

  async function register(body: RegistrationBody) {
    return await $fetch('/api/auth/registration', {
      method: 'POST',
      body,
    })
  }

  async function passwordReset(body: PasswordResetBody) {
    return await $fetch('/api/auth/password/reset', {
      method: 'POST',
      body,
    })
  }

  async function passwordResetConfirm(body: PasswordResetConfirmBody) {
    return await $fetch('/api/auth/password/reset/confirm', {
      method: 'POST',
      body,
    })
  }

  async function passwordChange(body: PasswordChangeBody) {
    return await $fetch('/api/auth/password/change', {
      method: 'POST',
      body,
    })
  }

  async function registrationResendEmail(body: RegistrationResendEmailBody) {
    return await $fetch('/api/auth/registration/resend-email', {
      method: 'POST',
      body,
    })
  }

  async function registrationVerifyEmail(body: RegistrationVerifyEmailBody) {
    return await $fetch('/api/auth/registration/verify-email', {
      method: 'POST',
      body,
    })
  }

  async function tokenVerify(body: TokenVerifyBody) {
    return await $fetch('/api/auth/token/verify', {
      method: 'POST',
      body,
    })
  }

  async function tokenRefresh(body: TokenRefreshBody) {
    return await $fetch('/api/auth/token/refresh', {
      method: 'POST',
      body,
    })
  }

  async function socialAccountDisconnect(
    id: number,
    body: SocialAccountDisconnectBody,
  ) {
    return await $fetch(`/api/auth/social-accounts/${id}/disconnect`, {
      method: 'POST',
      body,
    })
  }

  return {
    login,
    loginWithProvider,
    logout,
    register,
    passwordReset,
    passwordResetConfirm,
    passwordChange,
    registrationResendEmail,
    registrationVerifyEmail,
    tokenVerify,
    tokenRefresh,
    socialAccounts,
    socialAccountDisconnect,
    fetchUser,
  }
}
