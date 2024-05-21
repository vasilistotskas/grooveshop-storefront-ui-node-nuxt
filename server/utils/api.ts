import type { QueryObject } from 'ufo'

type AllAuthResponse = {
  status: number
  data?: Record<string, any>
  meta?: {
    session_token?: string
    access_token?: string
    is_authenticated?: boolean
  }
}

export function buildFullUrl(url: string, query: QueryObject): string {
  const valuesToExclude: (QueryObject[keyof QueryObject] | undefined)[] = [
    undefined,
    null,
    '',
    'null',
    'undefined',
  ]
  if (Object.keys(query).length > 0) {
    url += '?'
    Object.entries(query).forEach(([key, value]) => {
      if (!valuesToExclude.includes(value)) {
        url += `${key}=${value}&`
      }
    })
    if (url.endsWith('&')) {
      url = url.slice(0, -1)
    }
  }
  return url
}

export function createAuthenticationHeaders(sessionToken?: string | null, sessionCookie?: string | null) {
  const headers = {} as Record<string, string>

  if (sessionCookie) {
    headers['X-Session-Token'] = sessionCookie
  }

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`
  }

  return headers
}

export async function processAllAuthSession(response: AllAuthResponse) {
  const event = useEvent()

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
