import { defineEventHandler } from 'nuxt/server'

/**
 * The signed-in user's id on the request's wide event.
 *
 * A visitor without a session has no user to record, and reading the
 * session anyway would mint one (`requestHasSession` in server/utils/auth.ts)
 * and send an anonymous visitor a cookie on every page. Build assets and
 * images are skipped as well: the browser sends the cookie with each of
 * them, and unsealing it there buys nothing.
 */
export default defineEventHandler(async (event) => {
  const path = event.url.pathname
  if (path.startsWith('/_nuxt') || path.startsWith('/_ipx') || path.startsWith('/assets')) return
  if (!requestHasSession(event)) return

  const session = await getUserSession(event)
  if (session.user) {
    event.context.log?.set({ user: { id: session.user.id } })
  }
})
