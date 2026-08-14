/**
 * Routes prerendered at build time (see ``routeRules`` in ``nuxt.config.ts``,
 * which derives its ``prerender: true`` entries from this list).
 *
 * The CSP middleware also consumes it: prerendered HTML has its inline
 * scripts baked at build time, so a per-request nonce policy would block
 * them — these routes keep the ``'unsafe-inline'``-based policy while every
 * SSR route gets the strict nonce + ``'strict-dynamic'`` policy.
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
