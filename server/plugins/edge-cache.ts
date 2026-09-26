/**
 * Mark the pages Nitro served from its page cache as cacheable at the
 * Cloudflare edge, and tag them for purging. The rules and the reasons
 * are in ``server/utils/edgeCache.ts``.
 *
 * The headers are set as the response ends, on the request's own
 * response object, because that is the one seam both answers pass
 * through: a 200 (h3 ends it with the body) and a 304 revalidation, which
 * h3's ``handleCacheHeaders`` ends itself — before any ``beforeResponse``
 * hook, carrying ``public, max-age=…, s-maxage=…``. Left alone, that 304
 * is what Cloudflare stores when it revalidates: browsers would then get
 * a five-minute ``max-age`` on HTML, and ``s-maxage`` would switch off
 * the edge's stale-while-revalidate. A response streamed before it ends
 * has already sent its headers; it is skipped and stays uncached.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('request', (event) => {
    const res = event.node?.res
    if (!res || (event.method !== 'GET' && event.method !== 'HEAD')) return
    const end = res.end.bind(res) as (...args: unknown[]) => typeof res
    res.end = ((...args: unknown[]) => {
      if (!res.headersSent && isEdgeCacheableResponse(event)) {
        res.setHeader('cache-control', 'no-cache')
        res.setHeader('cloudflare-cdn-cache-control', EDGE_CACHE_CONTROL)
        res.setHeader('cache-tag', `${EDGE_CACHE_TAG},${edgeCacheTenantTag(event.context.tenant!.schemaName)}`)
      }
      return end(...args)
    }) as typeof res.end
  })
})
