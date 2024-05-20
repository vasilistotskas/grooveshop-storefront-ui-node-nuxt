import type { QueryObject } from 'ufo'
import type { AllAuthSession } from '~/types/all-auth'

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

export const useAllAuthSession = async () => {
  return await useSession<AllAuthSession>(useEvent(), {
    name: 'all-auth-session',
    password: '80d42cfb-1cd2-462c-8f17-e3237d9027e9',
  })
}

export const clearAllAuthSession = async () => {
  const session = await useAllAuthSession()
  await session.clear()
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
  const session = await useAllAuthSession()

  if (response.meta?.session_token) {
    appendResponseHeader(useEvent(), 'X-Session-Token', response.meta.session_token)
    await session.update({
      sessionToken: response.meta.session_token,
    })
  }
  if (response.meta?.access_token) {
    appendResponseHeader(useEvent(), 'Authorization', `Bearer ${response.meta.access_token}`)
    await session.update({
      accessToken: response.meta.access_token,
    })
  }
}

export async function getAllAuthHeaders() {
  const session = await useAllAuthSession()
  const sessionToken = session.data.sessionToken
  const accessToken = session.data.accessToken

  return createAuthenticationHeaders(sessionToken, accessToken)
}

export async function getAllAuthSessionToken() {
  const session = await useAllAuthSession()
  return session.data.sessionToken
}

export async function getAllAuthAccessToken() {
  const session = await useAllAuthSession()
  return session.data.accessToken
}
