/**
 * A page rendered with a fallback (the store's texts could not be loaded,
 * so the build's defaults stand in) must reach no cache: neither Nitro's
 * page cache, the Cloudflare edge nor a browser, or the fallback would
 * outlive the failure it stands in for.
 *
 * Nitro stores a page-cache entry only when its status is below 400
 * (`defineCachedEventHandler`'s `validate`), so the render answers with
 * this status while it is still inside the cache, and
 * `server/plugins/edge-cache.ts` puts the real status back as the response
 * ends and marks it `private, no-store`. A visitor sees a normal page; the
 * next request renders again.
 */
export const DEGRADED_RENDER_STATUS = 503
