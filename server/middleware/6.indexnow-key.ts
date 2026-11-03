import { defineEventHandler } from 'nuxt/server'

/**
 * The IndexNow key file: `/<key>.txt` holding the key, which proves to the
 * search engines that the host's store sent the URLs Django submits.
 *
 * A middleware rather than a route: a file route named after a variable
 * would match every path of the site root. `indexnowKey` is empty unless
 * the store turned IndexNow on, and the path must be that store's own key,
 * so any other `.txt` carries on to the page's 404.
 */
export default defineEventHandler((event) => {
  const key = event.context.tenant?.indexnowKey
  if (!key || event.url.pathname !== `/${key}.txt`) return

  event.res.headers.set('content-type', 'text/plain; charset=utf-8')
  return key
})
