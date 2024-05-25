import { ZodUserAccount } from '~/types/user/account'
import type { AllAuthResponse } from '~/types/all-auth'

export function createAuthenticationHeaders(sessionToken?: string | null, _accessToken?: string | null) {
  const headers = {} as Record<string, string>

  headers['Content-Type'] = 'application/json'

  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken
    headers['Authorization'] = `Bearer ${sessionToken}`
  }

  return headers
}

export async function processAllAuthSession(response: AllAuthResponse) {
  const event = useEvent()

  if (response.status === 200 && response.meta?.is_authenticated) {
    if (response.meta?.session_token) {
      appendResponseHeader(event, 'X-Session-Token', response.meta.session_token)
      await setUserSession(event, {
        sessionToken: response.meta.session_token,
      })
    }
    if (response.meta?.access_token) {
      appendResponseHeader(event, 'Authorization', `Bearer ${response.meta.access_token}`)
      await setUserSession(event, {
        accessToken: response.meta.access_token,
      })
    }
  }

  if (response.status === 200 && response.meta?.access_token && response.data.user) {
    await fetchUserData(response)
  }
}

export async function getAllAuthHeaders() {
  const session = await getUserSession(useEvent())
  const sessionToken = session.sessionToken
  const accessToken = session.accessToken

  return createAuthenticationHeaders(sessionToken, accessToken)
}

export async function getAllAuthSessionToken() {
  const session = await getUserSession(useEvent())
  return session.sessionToken
}

export async function getAllAuthAccessToken() {
  const session = await getUserSession(useEvent())
  return session.accessToken
}

export async function requireAllAuthAccessToken() {
  const session = await requireUserSession(useEvent())
  return session.accessToken
}

export async function fetchUserData(response: AllAuthResponse) {
  const config = useRuntimeConfig()
  const user = await $fetch(`${config.public.apiBaseUrl}/user/account/${response.data.user.id}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${response.meta?.access_token}`,
    },
  })

  const userResponse = await parseDataAs(user, ZodUserAccount)
  await setUserSession(useEvent(), {
    user: userResponse,
  })
  return userResponse
}
