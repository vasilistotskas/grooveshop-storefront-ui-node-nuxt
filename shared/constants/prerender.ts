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
