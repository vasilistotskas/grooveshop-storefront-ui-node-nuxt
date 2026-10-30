import { defineEventHandler } from 'nuxt/server'

/**
 * The signed-in user's id on the request's wide event.
 *
 * A visitor without a session has no user to record, and `readUserSession`
 * (server/utils/auth.ts) reads none for them rather than minting one and
 * sending an anonymous visitor a cookie on every page. Build assets and
 * images are skipped as well: the browser sends the cookie with each of
 * them, and unsealing it there buys nothing.
 */
export default defineEventHandler(async (event) => {
  const path = event.url.pathname
  if (path.startsWith('/_nuxt') || path.startsWith('/_ipx')) return

  const session = await readUserSession(event)
  if (session.user) {
    event.context.log?.set({ user: { id: session.user.id } })
  }
})
