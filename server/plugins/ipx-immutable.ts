/**
 * Mark successful IPX responses immutable.
 *
 * The IPX handler sets `Cache-Control: max-age=…, public, s-maxage=…`
 * itself (overriding any route-rule header, which is why this is a
 * `beforeResponse` hook and not a route rule). Without ``immutable`` a
 * browser RELOAD revalidates every image, and IPX responses carry no
 * ETag/Last-Modified, so each revalidation is a full re-download plus
 * a Sharp re-encode — header logos visibly popped in seconds after
 * every reload. IPX URLs encode all transform params, so a cached
 * response never needs rechecking.
 *
 * Only 200s: an error response (missing source, bad modifier) must not
 * be pinned in the browser cache for a year.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('beforeResponse', (event) => {
    if (
      event.path.startsWith('/_ipx/')
      && getResponseStatus(event) === 200
    ) {
      setResponseHeader(
        event,
        'Cache-Control',
        'public, max-age=31536000, immutable',
      )
    }
  })
})
