import type { H3Event } from 'h3'
import { DEFAULT_LOCALE } from '~~/i18n/locales'
import { clientIdentityHeaders } from './clientIdentity'

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

  const headers = {} as Record<string, string>

  headers['Content-Type'] = 'application/json'

  const config = useRuntimeConfig()

  // Tell Django the original request was HTTPS so SECURE_SSL_REDIRECT
  // doesn't 301 to the external domain.
  //
  // This MUST be derived from the site's public scheme, not only from
  // the incoming event: `apiBaseUrl` points at the in-cluster Service
  // (http://backend-service:80), so whenever the resolved protocol is
  // not https Django answers 301 → https://<public-host>/api/v1/... and
  // ofetch FOLLOWS it straight out of the cluster. The request then
  // comes back as whatever the public host says — a Traefik basic-auth
  // `401 Unauthorized` on staging, a Nuxt `404` in production — instead
  // of data, so product pages 404 at random (observed on both envs).
  // Requests that reach here without a usable event context (cached
  // handlers revalidating in the background, prerender, startup) are
  // exactly the ones that used to lose the header.
  const publicScheme = (config.public.baseUrl || '').startsWith('http://')
    ? 'http'
    : 'https'
  const requestProtocol = getRequestProtocol(event, { xForwardedProto: true })
  headers['X-Forwarded-Proto']
    = requestProtocol === 'https' ? requestProtocol : publicScheme

  // Tenant resolution: prefer the actual request host so Django's
  // TenantMainMiddleware picks the tenant the caller is on. Falls back
  // to the configured public Django hostname only when outside a request
  // context (prerender/startup). django-tenants sets ALLOWED_HOSTS=["*"]
  // because domain validation happens at the tenant-resolution layer.
  const host = getRequestHost(event, { xForwardedHost: false }) || config.public.djangoHostName
  if (host) {
    headers['X-Forwarded-Host'] = host
  }

  if (sessionToken) {
    headers['X-Session-Token'] = sessionToken
  }

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`
  }

  // Who the visitor is — client IP, proof of edge, user agent. Shared
  // with `useBackendFetch()` so no backend call can drop them.
  Object.assign(headers, clientIdentityHeaders(event))

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
  let headers: Record<string, string>
  if (response.meta?.is_authenticated && !token) {
    // getAllAuthHeaders → createHeaders, which already sets the
    // tenant-aware X-Forwarded-Host (actual request host, falling back
    // to djangoHostName only outside a request context).
    headers = await getAllAuthHeaders()
  }
  else {
    headers = {
      'X-Forwarded-Proto': getRequestProtocol(event, { xForwardedProto: true }),
      // Tenant resolution: prefer the actual request host so Django's
      // TenantMainMiddleware picks the right schema; fall back to the
      // configured public hostname only when outside a request context
      // (prerender/startup). Matches the createHeaders() convention.
      'X-Forwarded-Host': getRequestHost(event, { xForwardedHost: false }) || config.public.djangoHostName,
      'X-Language': locale,
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
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
