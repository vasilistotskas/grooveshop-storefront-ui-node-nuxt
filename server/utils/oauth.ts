import { withQuery } from 'ufo'
import type { H3Event } from 'h3'

export const OAUTH_PROCESS_COOKIE = 'oauth_process'

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !import.meta.dev,
  sameSite: 'lax' as const,
  maxAge: 60 * 5,
  path: '/',
}

export function captureOAuthProcess(event: H3Event, query: Record<string, string | string[]>) {
  if (!query.code && !query.error) {
    const oauthProcess = String(query.process || 'login')
    setCookie(event, OAUTH_PROCESS_COOKIE, oauthProcess, OAUTH_COOKIE_OPTIONS)
  }
}

export function readAndClearOAuthProcess(event: H3Event): 'login' | 'connect' {
  const process = (getCookie(event, OAUTH_PROCESS_COOKIE) || 'login') as 'login' | 'connect'
  deleteCookie(event, OAUTH_PROCESS_COOKIE)
  return process
}

export async function storeOAuthTokensAndRedirect(
  event: H3Event,
  provider: string,
  tokens: { access_token?: string | null, id_token?: string | null },
  clientId: string | undefined,
  oauthProcess: 'login' | 'connect',
) {
  await setUserSession(event, {
    secure: {
      oauthParams: {
        provider,
        access_token: tokens.access_token ?? undefined,
        id_token: tokens.id_token ?? undefined,
        client_id: clientId ?? undefined,
        process: oauthProcess,
      },
    },
  })

  const redirectUrl = withQuery('/account/provider/callback', {
    provider,
    process: oauthProcess,
  })
  return sendRedirect(event, redirectUrl)
}

export async function redirectOAuthError(event: H3Event, provider: string) {
  deleteCookie(event, OAUTH_PROCESS_COOKIE)
  const redirectUrl = withQuery('/account/provider/callback', {
    provider,
    error: 'oauth_error',
  })
  return sendRedirect(event, redirectUrl)
}
