/**
 * Mark successful IPX responses immutable.
 *
 * IPX emits `Cache-Control: max-age=…, public, s-maxage=…` plus a weak
 * ETag, so a browser RELOAD revalidates every image (one conditional
 * GET per image through Traefik → Nitro → IPX) — which is when the
 * header logo visibly popped in. IPX URLs encode all transform params,
 * so a cached response never needs rechecking: ``immutable`` lets
 * reloads paint straight from the browser cache.
 *
 * Neither a `/_ipx/**` route rule nor a `beforeResponse` hook can do
 * this: the handler overwrites route-rule headers, and it flushes the
 * response itself, so by `beforeResponse` time `headersSent` is
 * already true (verified against a local production build). The only
 * seam left is intercepting `setHeader` on the request's own response
 * object. The rewrite fires only while the status is still 200 — on
 * IPX's error path the source lookup fails BEFORE any cache-control is
 * set, so a 404 never carries (or inherits) the immutable header.
 */
const IMMUTABLE = 'public, max-age=31536000, immutable'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    if (!event.path.startsWith('/_ipx/')) return
    const res = event.node?.res
    if (!res) return
    const original = res.setHeader.bind(res)
    res.setHeader = (name, value) =>
      original(
        name,
        String(name).toLowerCase() === 'cache-control'
        && res.statusCode === 200
          ? IMMUTABLE
          : value,
      )
  })
})
