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
  if (event.path.startsWith('/_nuxt') || event.path.startsWith('/_ipx') || event.path.startsWith('/assets')) return
  if (!requestHasSession(event)) return

  const session = await getUserSession(event)
  if (session.user) {
    useLogger(event).set({ user: { id: session.user.id } })
  }
})
