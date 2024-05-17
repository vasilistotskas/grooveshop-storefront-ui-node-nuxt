import type { LoginBody, TwoFaAuthenticateBody } from '~/types/all-auth'

export default function () {
  async function login(body: LoginBody) {
    try {
      return await $fetch('/api/_allauth/app/v1/auth/login', {
        method: 'POST',
        body,
      })
    }
    catch (error) {
      const { data } = error.data.data

      if (data && data.flows) {
        for (const flow of data.flows) {
          if (flow.id === 'mfa_authenticate' && flow.is_pending === true) {
            await navigateTo('/auth/2fa/authenticate')
            return
          }
        }
      }
    }
  }

  async function twoFaAuthenticate(body: TwoFaAuthenticateBody) {
    return await $fetch('/api/_allauth/app/v1/auth/2fa/authenticate', {
      method: 'POST',
      body,
    })
  }

  return {
    login,
    twoFaAuthenticate,
  }
}
