import type { H3Event } from 'h3'

// Responses that only carry session tokens in meta (no authenticated user data).
// Used by endpoints like /auth/code/request and /auth/webauthn/login (GET).
type PartialAllAuthResponse = {
  status: 200
  data?: Record<string, unknown>
  meta?: {
    session_token?: string
    access_token?: string
    is_authenticated?: boolean | null
  }
}

export function createHeaders(sessionToken?: string | null, accessToken?: string | null) {
  const event = useEvent()

  const requestHeaders = getRequestHeaders(event)
  const headers = {} as Record<string, string>

  headers['Content-Type'] = 'application/json'

  // Tell Django the original request was HTTPS so SECURE_SSL_REDIRECT
  // doesn't 301 to the external domain (which exits the cluster → Cloudflare 403).
  // Also set by the forwarded-proto plugin, but explicit here for safety.
  headers['X-Forwarded-Proto'] = getRequestProtocol(event, { xForwardedProto: true })

  // Use the configured public Django hostname so Django's ALLOWED_HOSTS
  // check passes for internal cluster calls. Falls back to the request's
  // server-trusted Host only if the config is missing.
  const config = useRuntimeConfig()
  const host = config.public.djangoHostName || getRequestHost(event, { xForwardedHost: false })
  if (host) {
    headers['X-Forwarded-Host'] = host
  }

  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  if (requestHeaders['user-agent']) {
    headers['User-Agent'] = requestHeaders['user-agent']
  }

  if (requestHeaders['x-forwarded-for']) {
    headers['X-Forwarded-For'] = requestHeaders['x-forwarded-for']
  }

  return headers
}

export async function processAllAuthSession(response: AllAuthResponse | PartialAllAuthResponse, accessToken?: string | null, sessionToken?: string | null) {
  const event = useEvent()

  const resolvedSessionToken = response.meta?.session_token ?? sessionToken
  const resolvedAccessToken = response.meta?.access_token ?? accessToken

  // Tokens are stored exclusively in the server-side encrypted session cookie.
  // Do NOT expose them in response headers — they are only needed server-to-server.
  if (resolvedSessionToken || resolvedAccessToken) {
    log.debug('auth', 'Storing tokens in encrypted session')
    const existingSession = await getUserSession(event)
    await replaceUserSession(event, {
      ...existingSession,
      secure: {
        sessionToken: resolvedSessionToken ?? existingSession.secure?.sessionToken,
        accessToken: resolvedAccessToken ?? existingSession.secure?.accessToken,
      },
    })
  }

  if (response.data?.user && ((response.status === 200 && response.meta?.access_token) || response.meta?.is_authenticated)) {
    log.debug('auth', 'Fetching user data')
    await fetchUserData(response as AllAuthResponse, accessToken)
  }
}

export async function getAllAuthHeaders() {
  const session = await getUserSession(useEvent())
  const sessionToken = session.secure?.sessionToken
  const accessToken = session.secure?.accessToken

  return createHeaders(sessionToken, accessToken)
}

export async function getAllAuthSessionToken() {
  const session = await getUserSession(useEvent())
  return session.secure?.sessionToken
}

export async function getAllAuthAccessToken(event?: H3Event) {
  const session = await getUserSession(event ?? useEvent())
  return session?.secure?.accessToken
}

export async function requireAllAuthAccessToken(event?: H3Event): Promise<string> {
  const session = await requireUserSession(event ?? useEvent())
  const accessToken = session?.secure?.accessToken
  if (!accessToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Access token required',
    })
  }
  return accessToken
}

export async function fetchUserData(response: AllAuthResponse, accessToken?: string | null) {
  const config = useRuntimeConfig()
  const token = accessToken || response.meta?.access_token
  let headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-Forwarded-Proto': getRequestProtocol(useEvent(), { xForwardedProto: true }),
    'X-Forwarded-Host': config.public.djangoHostName || getRequestHost(useEvent(), { xForwardedHost: false }),
  }
  if (response.meta?.is_authenticated && !token) {
    headers = await getAllAuthHeaders()
  }
  const user = await $fetch(`${config.apiBaseUrl}/user/account/${response.data.user.id}`, {
    method: 'GET',
    headers,
  })

  const userResponse = await parseDataAs(user, zUserDetails)
  await setUserSession(useEvent(), {
    user: userResponse,
  })
  return userResponse
}
