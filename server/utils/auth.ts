import type { H3Event } from 'h3'

export function createHeaders(sessionToken?: string | null, accessToken?: string | null) {
  const event = useEvent()

  const requestHeaders = getRequestHeaders(event)
  const headers = {} as Record<string, string>

  headers['Content-Type'] = 'application/json'

  const host = getRequestHost(event, { xForwardedHost: true })
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

  return {
    ...headers,
  }
}

export async function processAllAuthSession(response: AllAuthResponse, accessToken?: string | null, sessionToken?: string | null) {
  const event = useEvent()

  if (response.meta?.session_token) {
    console.info('Setting session token from response')
    appendResponseHeader(event, 'X-Session-Token', response.meta.session_token)
    await setUserSession(event, {
      secure: {
        sessionToken: response.meta.session_token,
      },
    })
  }
  else if (sessionToken) {
    console.info('Setting session token from parameter')
    appendResponseHeader(event, 'X-Session-Token', sessionToken)
    await setUserSession(event, {
      secure: {
        sessionToken,
      },
    })
  }
  console.log('response: ', response)
  if (response.meta?.access_token) {
    console.info('Setting access token from response')
    console.log('Setting access token from response: ', response.meta.access_token)
    appendResponseHeader(event, 'Authorization', `Bearer ${response.meta.access_token}`)
    await setUserSession(event, {
      secure: {
        accessToken: response.meta.access_token,
      },
    })
  }
  else if (accessToken) {
    console.info('Setting access token from parameter')
    appendResponseHeader(event, 'Authorization', `Bearer ${accessToken}`)
    await setUserSession(event, {
      secure: {
        accessToken,
      },
    })
  }

  if ((response.status === 200 && response.meta?.access_token && response.data.user) || response.meta?.is_authenticated) {
    console.info('Fetching user data')
    await fetchUserData(response, accessToken)
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
    Authorization: `Bearer ${token}`,
  }
  if (response.meta?.is_authenticated && !token) {
    headers = await getAllAuthHeaders()
  }
  const user = await $fetch(`${config.apiBaseUrl}/user/account/${response.data.user.id}`, {
    method: 'GET',
    headers,
  })

  const userResponse = await parseDataAs(user, zAuthentication)
  await setUserSession(useEvent(), {
    user: userResponse,
  })
  return userResponse
}
