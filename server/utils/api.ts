import type { QueryObject } from 'ufo'
import type { H3Event } from 'h3'

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

export async function getSessionToken(event: H3Event) {
  const session = await getUserSession(event)
  return session?.token
}

export function getSessionCookie(event: H3Event) {
  return getCookie(event, 'session_token')
}

export function createAuthenticationHeaders(sessionToken?: string | null, sessionCookie?: string) {
  const headers = {
    'Content-Type': 'application/json',
  } as Record<string, string>

  if (sessionCookie) {
    headers['X-Session-Token'] = sessionCookie
  }

  if (sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`
  }

  return headers
}
