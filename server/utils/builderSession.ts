import { clearSession, createError, getCookie, getSession, updateSession, useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent, SessionConfig } from 'nuxt/server'

/**
 * The page builder's staff session: what `POST /api/builder/session` seals
 * after Django accepted a ticket, and what every `/api/builder/**` route
 * reads to act as that staff member.
 *
 * Its own cookie, sealed with the app's session password but named and
 * scoped apart from the customer session (`BUILDER_SESSION_COOKIE`).
 * SameSite=Strict: only a page of this store sends it, never a link from
 * another site. Its lifetime is the token's (`expiresAt`), nothing longer.
 *
 * ONLY `server/api/builder/**` may read it. A page or API route that goes
 * through Nitro's cache must never depend on who is asking, and a cached
 * route that read this cookie would serve one staff member's view to the
 * next visitor (`test/unit/source-rules/builder-session-is-private.spec.ts`).
 */
function sessionConfig(maxAge?: number): SessionConfig {
  return {
    name: BUILDER_SESSION_COOKIE,
    password: useRuntimeConfig().session.password,
    ...(maxAge !== undefined && { maxAge }),
    cookie: { httpOnly: true, secure: true, sameSite: 'strict', path: '/' },
  }
}

/** Seals `session` into the cookie, which lives until the token does. */
export async function writeBuilderSession(event: RequestEvent, session: BuilderSessionData): Promise<void> {
  const maxAge = Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)
  if (maxAge <= 0) {
    throw createError({ status: 502, statusText: 'The staff session is already expired' })
  }
  await updateSession(event, sessionConfig(maxAge), session)
}

/**
 * The staff session of the request, or `undefined` for a request without
 * one. Reading never creates a cookie (`getSession` would mint an empty
 * one for a request that has none), and a cookie that does not hold a live
 * session is expired on the spot.
 */
export async function readBuilderSession(event: RequestEvent): Promise<BuilderSessionData | undefined> {
  if (!getCookie(event, BUILDER_SESSION_COOKIE)) return undefined
  const config = sessionConfig()
  const { data } = await getSession(event, config)
  const session = ZodBuilderSessionData.safeParse(data)
  if (session.success && Date.parse(session.data.expiresAt) > Date.now()) {
    return session.data
  }
  await clearSession(event, config)
  return undefined
}

/**
 * Who may frame the response to this request: `'self'` (the store's own
 * pages, the editor) for a request that asks for a page as the editor's
 * preview (`hasBuilderCanvasMarker`) AND carries a live staff session,
 * `'none'` for every other request. The session is read only for a marked
 * request, so no other page pays for it.
 *
 * Read by `server/middleware/3.csp.ts`, which runs on the request itself,
 * outside Nitro's page cache: a cached render sees no cookie at all (it is
 * handed only the `varies` headers), and the framing headers are written
 * per request, never into a cache entry.
 */
export async function builderCanvasFraming(event: RequestEvent): Promise<CspFrameAncestors> {
  if (!hasBuilderCanvasMarker(`${event.url.pathname}${event.url.search}`)) return 'none'
  return await readBuilderSession(event) ? 'self' : 'none'
}

/** Ends the staff session: expires the cookie. */
export async function clearBuilderSession(event: RequestEvent): Promise<void> {
  await clearSession(event, sessionConfig())
}

/**
 * The staff member a `/api/builder/**` route acts for; 401 for a request
 * without a live staff session. `headers` carries their token to Django as
 * `Authorization: StaffBearer`: pass it on the call, so the token never leaves
 * this module as a bare value.
 */
export async function requireBuilderStaff(event: RequestEvent) {
  const session = await readBuilderSession(event)
  if (!session) {
    throw createError({ status: 401, statusText: 'Builder sign-in required' })
  }
  return {
    staff: session.staff,
    expiresAt: session.expiresAt,
    headers: { Authorization: `${BUILDER_STAFF_AUTH_SCHEME} ${session.token}` },
  }
}
