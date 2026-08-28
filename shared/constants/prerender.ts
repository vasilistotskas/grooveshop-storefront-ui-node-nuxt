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
 * Every route whose SSR response is cached and replayed across visitors
 * (static brand pages + runtime SWR routes). Consumed by the CSP
 * middleware: cached responses cannot carry a per-request nonce, so
 * these keep the ``'unsafe-inline'``-based policy.
 */
export const CACHED_SSR_ROUTES_SET: ReadonlySet<string>
  = new Set([...PRERENDERED_ROUTES, ...Object.keys(SWR_ROUTE_RULES)])
