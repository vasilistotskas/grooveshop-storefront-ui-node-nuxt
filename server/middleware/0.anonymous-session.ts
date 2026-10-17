import { defineEventHandler } from 'nuxt/server'

/**
 * nuxt-auth-utils' `GET /api/_auth/session` reads the session with
 * `getUserSession`, which mints one and sends `nuxt-session` back for a
 * request that carries none. The module's client plugin calls it for
 * every page served from the cache, so every visitor got a session
 * cookie before signing in or adding to a cart (2026-10-15). A request
 * without a session gets the module's own answer for an empty session,
 * `{}`, here; one with a session goes on to the module's handler, which
 * has no option to skip the write.
 */
export default defineEventHandler((event) => {
  if (event.req.method !== 'GET' || event.url.pathname !== '/api/_auth/session') return
  if (!requestHasSession(event)) return {}
})
