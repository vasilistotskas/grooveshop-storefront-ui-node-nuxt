/**
 * Brand-bearing static routes cached per tenant host (see ``routeRules``
 * in ``nuxt.config.ts``, which derives its ``swr`` + ``varies: ['host']``
 * entries from this list — they were build-time prerendered before
 * multi-tenancy, hence the name).
 *
 * The CSP middleware also consumes it: these responses are cached and
 * replayed for up to an hour, so a per-request nonce would be reused for
 * the whole cache lifetime — the routes keep the ``'unsafe-inline'``-based
 * policy while every uncached SSR route gets the strict nonce +
 * ``'strict-dynamic'`` policy.
 */
export const PRERENDERED_ROUTES = [
  '/about',
  '/contact',
  '/privacy-policy',
  '/terms-of-use',
  '/cookies-policy',
  '/return-policy',
  '/vision',
  '/what-is-microlearning',
  '/why-microlearning',
] as const

export const PRERENDERED_ROUTES_SET: ReadonlySet<string>
  = new Set(PRERENDERED_ROUTES)

/**
 * Runtime-SWR routes that are NOT static brand pages. The homepage is
 * the entry point for most sessions and its SSR is the single biggest
 * TTFB cost (PSI mobile pass, 2026-08-28); its content is tenant-level
 * (page-builder sections), never per-user, so it caches safely under
 * the same anonymous-render contract. Shorter TTL than the static
 * pages: it carries commercial content (prices, product rails).
 *
 * Anonymous-render contract (what makes ANY entry here safe):
 * ``app/plugins/setup.ts`` skips session/account/cart when
 * ``event.context.cache`` is set (the render is being stored), and
 * nuxt-auth-utils skips its session fetch the same way — so cached
 * HTML/payload is anonymous by construction and per-user UI hydrates
 * after ``app:suspense:resolve``.
 */
export const SWR_ROUTE_RULES: Readonly<Record<string, number>> = {
  '/': 300,
}

/**
 * Cached SSR for the CONTENT route families, keyed by Nitro glob.
 *
 * Only ``/`` and the static brand pages were cached, so every blog and
 * catalogue URL re-rendered per request: 3 sequential Django round trips
 * for a post (post, then category + author), more for a product. Measured
 * serially against production that is ~0.9s for a post and up to 2.4s for
 * ``/products`` versus 0.17s for the cached homepage — which is what
 * Ahrefs reports as "Slow server response for AI crawlers" across 44
 * pages. Crawlers hit the same URL repeatedly, so they are almost pure
 * cache hits.
 *
 * Same anonymous-render contract as ``SWR_ROUTE_RULES`` above; the
 * per-user pieces on these pages already resolve client-side
 * (``server: false`` on liked-posts, favourites and the user's own
 * review) so nothing personal was ever in the SSR payload.
 *
 * TTLs differ by what goes stale:
 *  - blog is editorial. Only the like/comment counters age, and they are
 *    social proof rather than commercial data.
 *  - catalogue carries PRICE and STOCK, so it gets the same 300s the
 *    homepage's product rails already run at. Staleness is bounded by
 *    the merchant's own edit, not the TTL: the Django Cache Management
 *    surfaces purge these route keys (``core/cache/surfaces.py``).
 */
const BLOG_SWR_TTL = 600
const CATALOG_SWR_TTL = 300

export const SWR_ROUTE_PATTERN_RULES: Readonly<Record<string, number>> = {
  // A glob does not match its own prefix, so the bare path is listed too.
  '/blog': BLOG_SWR_TTL,
  '/blog/**': BLOG_SWR_TTL,
  '/products': CATALOG_SWR_TTL,
  '/products/**': CATALOG_SWR_TTL,
}

/**
 * Path prefixes implied by ``SWR_ROUTE_PATTERN_RULES``, for callers that
 * need to answer "is this response cached?" without a glob matcher.
 */
const SWR_PATTERN_PREFIXES: readonly string[] = Object.keys(
  SWR_ROUTE_PATTERN_RULES,
)
  .filter(pattern => pattern.endsWith('/**'))
  // Strip the whole `/**`, trailing slash included: leaving it made the
  // `${prefix}/` check below compare against a doubled slash and never
  // match, so every nested route silently kept the nonce policy.
  .map(pattern => pattern.slice(0, -'/**'.length))

/**
 * Every route whose SSR response is cached and replayed across visitors
 * (static brand pages + runtime SWR routes). Consumed by the CSP
 * middleware: cached responses cannot carry a per-request nonce, so
 * these keep the ``'unsafe-inline'``-based policy.
 */
export const CACHED_SSR_ROUTES_SET: ReadonlySet<string>
  = new Set([
    ...PRERENDERED_ROUTES,
    ...Object.keys(SWR_ROUTE_RULES),
    ...Object.keys(SWR_ROUTE_PATTERN_RULES).filter(
      pattern => !pattern.endsWith('/**'),
    ),
  ])

/**
 * Whether a response for ``path`` is served from Nitro's cache and
 * therefore replayed across visitors.
 *
 * Use this rather than ``CACHED_SSR_ROUTES_SET.has()``: the set only
 * holds exact paths, and the content routes are globs. A cached response
 * cannot carry a per-request CSP nonce — it would be reused for the
 * whole cache lifetime — so these routes keep the ``'unsafe-inline'``
 * policy while every uncached SSR route gets nonce + ``strict-dynamic``.
 */
export function isCachedSsrRoute(path: string): boolean {
  const clean = path.replace(/\/+$/, '') || '/'
  if (CACHED_SSR_ROUTES_SET.has(clean)) return true
  return SWR_PATTERN_PREFIXES.some(
    prefix => clean === prefix || clean.startsWith(`${prefix}/`),
  )
}
