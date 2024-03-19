import { resolveURL, withQuery } from 'ufo'

import type {
  IsUserRegisteredBody,
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
  const { user } = useUserSession()

  function socialAccounts() {
    return useFetch('/api/auth/social-accounts', {
      method: 'GET',
    })
  }

  function fetchUser() {
    return useFetch('/api/auth/user', {
      method: 'GET',
    })
  }

  function userAccountDetails() {
    return useFetch(`/api/user/account/${user.value?.id}/details`, {
      method: 'GET',
      query: {
        expand: 'true',
      },
    })
  }

  /**
   * Login with email/password
   */
  function login(body: LoginBody) {
    return useFetch('/api/auth/login', {
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

  function logout(body?: LogoutBody) {
    return useFetch('/api/auth/logout', {
      method: 'POST',
      body,
    })
  }

  function register(body: RegistrationBody) {
    return useFetch('/api/auth/registration', {
      method: 'POST',
      body,
    })
  }

  function passwordReset(body: PasswordResetBody) {
    return useFetch('/api/auth/password/reset', {
      method: 'POST',
      body,
    })
  }

  function passwordResetConfirm(body: PasswordResetConfirmBody) {
    return useFetch('/api/auth/password/reset/confirm', {
      method: 'POST',
      body,
    })
  }

  function passwordChange(body: PasswordChangeBody) {
    return useFetch('/api/auth/password/change', {
      method: 'POST',
      body,
    })
  }

  function registrationResendEmail(body: RegistrationResendEmailBody) {
    return useFetch('/api/auth/registration/resend-email', {
      method: 'POST',
      body,
    })
  }

  function registrationVerifyEmail(body: RegistrationVerifyEmailBody) {
    return useFetch('/api/auth/registration/verify-email', {
      method: 'POST',
      body,
    })
  }

  function tokenVerify(body: TokenVerifyBody) {
    return useFetch('/api/auth/token/verify', {
      method: 'POST',
      body,
    })
  }

  function tokenRefresh(body: TokenRefreshBody) {
    return useFetch('/api/auth/token/refresh', {
      method: 'POST',
      body,
    })
  }

  function socialAccountDisconnect(
    id: number,
    body: SocialAccountDisconnectBody,
  ) {
    return useFetch(`/api/auth/social-accounts/${id}/disconnect`, {
      method: 'POST',
      body,
    })
  }

  function isUserRegistered(body: IsUserRegisteredBody) {
    return useFetch('/api/auth/is-user-registered', {
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
    isUserRegistered,
    userAccountDetails,
    fetchUser,
  }
}
