import type { H3Event } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'

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

  // Real client IP for allauth session tracking. Prefer Cloudflare's
  // CF-Connecting-IP (always set when the zone is proxied) and fall back
  // to True-Client-IP (Cloudflare Enterprise) before h3's XFF/socket
  // resolution. Using CF-Connecting-IP bypasses K3s klipper-lb's SNAT
  // — it rewrites the TCP source to the Flannel gateway (10.42.0.1), so
  // getRequestIP alone would surface that masked address in production.
  // Django's UserAccountAdapter reads this via X-Real-IP.
  const clientIp
    = requestHeaders['cf-connecting-ip']
      || requestHeaders['true-client-ip']
      || getRequestIP(event, { xForwardedFor: true })
  if (clientIp) {
    headers['X-Real-IP'] = clientIp
  }

  if (requestHeaders['x-forwarded-for']) {
    headers['X-Forwarded-For'] = requestHeaders['x-forwarded-for']
  }

  // Tell Django which language to render emails/responses in. The locale
  // middleware populates event.context.locale from (in order): ?locale query,
  // i18n cookies, Accept-Language. allauth's adapter + every Celery email
  // task reads this header to capture/override user language.
  const locale = (event?.context?.locale as string | undefined) || DEFAULT_LOCALE
  headers['X-Language'] = locale

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
  const event = useEvent()
  const token = accessToken || response.meta?.access_token
  const locale = (event?.context?.locale as string | undefined) || DEFAULT_LOCALE
  let headers: Record<string, string> = {
    'Authorization': `Bearer ${token}`,
    'X-Forwarded-Proto': getRequestProtocol(event, { xForwardedProto: true }),
    'X-Forwarded-Host': config.public.djangoHostName || getRequestHost(event, { xForwardedHost: false }),
    'X-Language': locale,
  }
  if (response.meta?.is_authenticated && !token) {
    headers = await getAllAuthHeaders()
  }
  const user = await $fetch(`${config.apiBaseUrl}/user/account/${response.data.user.id}`, {
    method: 'GET',
    headers,
  })

  const userResponse = await parseDataAs(user, zUserDetails)
  // Use replaceUserSession (not setUserSession) so any stale `user`
  // fields from a prior session — e.g. old email, username, or custom
  // keys no longer present in the new payload — are cleared. We
  // explicitly carry forward `secure` (Knox + session tokens) and
  // `oauthParams`, which were just set by processAllAuthSession above
  // and must survive this rebuild; setUserSession's defu merge kept them
  // by accident but also kept other stale `user` keys we want to drop.
  const current = await getUserSession(event)
  await replaceUserSession(event, {
    ...current,
    user: userResponse,
  })
  return userResponse
}
