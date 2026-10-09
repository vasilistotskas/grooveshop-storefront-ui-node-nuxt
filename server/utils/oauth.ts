import { withQuery } from 'ufo'
// The OAuth callbacks run inside nuxt-auth-utils' handler factories
// (`defineOAuth*EventHandler`), which hand them h3's event, so these use
// h3's own helpers.
import { deleteCookie, getCookie, sendRedirect, setCookie } from 'h3'
import type { H3Event } from 'h3'

export const OAUTH_PROCESS_COOKIE = 'oauth_process'

const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: !import.meta.dev,
  sameSite: 'lax' as const,
  maxAge: 60 * 5,
  path: '/',
}

type OAuthProcess = 'login' | 'connect'

/**
 * The OAuth process a value names, by allauth's own enum (the provider
 * token body's `process`); anything else — absent, a forged cookie, a
 * mangled query — is a sign-in.
 */
function oauthProcessOf(value: unknown): OAuthProcess {
  return ZodProviderTokenBody.shape.process.safeParse(value).data ?? 'login'
}

export function captureOAuthProcess(event: H3Event, query: Record<string, string | string[]>) {
  if (!query.code && !query.error) {
    setCookie(event, OAUTH_PROCESS_COOKIE, oauthProcessOf(query.process), OAUTH_COOKIE_OPTIONS)
  }
}

/**
 * The process remembered for this sign-in, validated like the query it
 * came from: the cookie is httpOnly and set here, but a client (or a
 * sibling subdomain's cookie on the parent domain) can send any value.
 */
export function readAndClearOAuthProcess(event: H3Event): OAuthProcess {
  const process = oauthProcessOf(getCookie(event, OAUTH_PROCESS_COOKIE))
  deleteCookie(event, OAUTH_PROCESS_COOKIE)
  return process
}

export async function storeOAuthTokensAndRedirect(
  event: H3Event,
  provider: string,
  tokens: { access_token?: string | null, id_token?: string | null },
  clientId: string | undefined,
  oauthProcess: OAuthProcess,
) {
  // Preserve any existing session (e.g. an already-authenticated user
  // running ``process=connect`` to add a social provider) — a bare
  // replaceUserSession call would wipe their sessionToken/accessToken
  // mid-flow and force a re-login on the callback.
  const current = await getUserSession(event)
  await replaceUserSession(event, {
    ...current,
    secure: {
      ...(current.secure ?? {}),
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
