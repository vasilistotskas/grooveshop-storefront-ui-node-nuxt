import { resolveURL, withQuery } from 'ufo'

const API_BASE_URL = '/api/_allauth/app/v1/auth'

export default function () {
  async function getSession(encrypted_token: string | null = null) {
    const headers = useRequestHeaders()
    if (encrypted_token) {
      Object.assign(headers, {
        'X-Encrypted-Token': encrypted_token,
      })
    }

    return $fetch<SessionResponse>(`${API_BASE_URL}/session`, {
      method: 'GET',
      headers,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function deleteSession() {
    return $fetch(`${API_BASE_URL}/session`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function login(body: LoginBody) {
    return $fetch<LoginResponse>(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function signup(body: SignupBody) {
    return $fetch<SignupResponse>(`${API_BASE_URL}/signup`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getEmailVerify(key: string) {
    return $fetch<EmailVerifyGetResponse>(`${API_BASE_URL}/email/verify`, {
      method: 'GET',
      headers: {
        ...useRequestHeaders(),
        'X-Email-Verification-Key': key,
      },
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function emailVerify(body: EmailVerifyPostBody) {
    return $fetch<EmailVerifyPostResponse>(`${API_BASE_URL}/email/verify`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function reauthenticate(body: ReauthenticateBody) {
    return $fetch<ReauthenticateResponse>(`${API_BASE_URL}/reauthenticate`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function passwordRequest(body: PasswordRequestBody) {
    return $fetch<PasswordRequestResponse>(`${API_BASE_URL}/password/request`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getPasswordReset(key: string) {
    return $fetch<PasswordResetGetResponse>(`${API_BASE_URL}/password/reset`, {
      method: 'GET',
      headers: {
        ...useRequestHeaders(),
        'X-Password-Reset-Key': key,
      },
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function passwordReset(body: PasswordResetPostBody) {
    return $fetch<PasswordResetPostResponse>(`${API_BASE_URL}/password/reset`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  function providerRedirect(provider: Provider): void {
    if (import.meta.client) {
      const route = useRoute()

      const returnToPath = route.query.redirect?.toString()

      let redirectUrl = resolveURL('/auth', provider.id)

      redirectUrl = withQuery(redirectUrl, { redirect: returnToPath })

      window.location.replace(redirectUrl)
    }
  }

  async function browserProviderRedirect(body: ProviderRedirectBody) {
    const config = useRuntimeConfig()
    const csrfToken = useCookie('csrftoken').value

    const form = document.createElement('form')
    form.method = 'POST'
    form.action = `${config.public.djangoUrl}/_allauth/browser/v1/auth/provider/redirect`

    for (const [key, value] of Object.entries(body)) {
      const input = document.createElement('input')
      input.type = 'hidden'
      input.name = key
      input.value = value
      form.appendChild(input)
    }

    if (csrfToken) {
      const csrfInput = document.createElement('input')
      csrfInput.type = 'hidden'
      csrfInput.name = 'csrfmiddlewaretoken'
      csrfInput.value = csrfToken
      form.appendChild(csrfInput)
    }

    document.body.appendChild(form)
    form.submit()
  }

  async function providerToken(body: ProviderTokenBody) {
    return $fetch<ProviderTokenResponse>(`${API_BASE_URL}/provider/token`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function providerSignup(body: ProviderSignupBody) {
    return $fetch<ProviderSignupResponse>(`${API_BASE_URL}/provider/signup`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function twoFaAuthenticate(body: TwoFaAuthenticateBody) {
    return $fetch<TwoFaAuthenticateResponse>(`${API_BASE_URL}/2fa/authenticate`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function twoFaReauthenticate(body: TwoFaReauthenticateBody) {
    return $fetch<TwoFaReauthenticateResponse>(`${API_BASE_URL}/2fa/reauthenticate`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function requestLoginCode(body: CodeRequestBody) {
    return $fetch(`${API_BASE_URL}/code/request`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function confirmLoginCode(body: CodeConfirmBody) {
    return $fetch<CodeConfirmResponse>(`${API_BASE_URL}/code/confirm`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getWebAuthnRequestOptionsForReauthentication() {
    return $fetch<WebAuthnReauthenticateGetResponse>(`${API_BASE_URL}/webauthn/reauthenticate`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function reauthenticateUsingWebAuthn(body: WebAuthnReauthenticatePostBody) {
    return $fetch<WebAuthnReauthenticatePostResponse>(`${API_BASE_URL}/webauthn/reauthenticate`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function authenticateUsingWebAuthn(body: WebAuthnAuthenticatePostBody) {
    return $fetch<WebAuthnAuthenticatePostResponse>(`${API_BASE_URL}/webauthn/authenticate`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function loginUsingWebAuthn(body: WebAuthnLoginPostBody) {
    return $fetch<WebAuthnLoginPostResponse>(`${API_BASE_URL}/webauthn/login`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getWebAuthnRequestOptionsForLogin() {
    return $fetch<WebAuthnLoginGetResponse>(`${API_BASE_URL}/webauthn/login`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getWebAuthnRequestOptionsForAuthentication() {
    return $fetch<WebAuthnAuthenticateGetResponse>(`${API_BASE_URL}/webauthn/authenticate`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function signUpByPasskey(body: WebAuthnSignupPostBody) {
    return $fetch<WebAuthnSignupPostResponse>(`${API_BASE_URL}/webauthn/signup`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function getWebAuthnCreateOptionsAtSignup() {
    return $fetch<WebAuthnSignupGetResponse>(`${API_BASE_URL}/webauthn/signup`, {
      method: 'GET',
      headers: useRequestHeaders(),
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
      },
    })
  }

  async function signupWebAuthnCredential(body: WebAuthnSignupPutBody) {
    return $fetch<WebAuthnSignupPutResponse>(`${API_BASE_URL}/webauthn/signup`, {
      method: 'PUT',
      headers: useRequestHeaders(),
      body,
      async onResponse({ response }) {
        await onAllAuthResponse(response)
      },
      async onResponseError({ response }) {
        await onAllAuthResponseError(response)
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
    browserProviderRedirect,
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
    signUpByPasskey,
    getWebAuthnCreateOptionsAtSignup,
    signupWebAuthnCredential,
  }
}
