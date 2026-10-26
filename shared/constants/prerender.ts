import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '../../i18n/locales.ts'
import { splitLocale } from '../i18n/localeFromPath.ts'
import { isCustomPageSlug } from '../utils/customPageSlug.ts'

/**
 * What a cached page's key varies on: the store, the device class the
 * markup depends on (`1.device-class.ts`) and the store's tenant-config
 * epoch (`1.tenant-epoch.ts`), so a page rendered from features a purge
 * has since changed is never served to a pod that has seen the purge.
 */
export const CACHED_PAGE_VARIES = ['host', 'x-device-class', 'x-tenant-epoch']

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

/**
 * The locales whose pages carry a path prefix (`prefix_except_default`).
 */
const PREFIXED_LOCALES = SUPPORTED_LOCALES.filter(
  locale => locale !== DEFAULT_LOCALE,
)

/**
 * A cached route and its counterpart under every prefixed locale:
 * `/products/**` → `/products/**`, `/en/products/**`; `/` → `/`, `/en`.
 *
 * The route rules in `nuxt.config.ts` are built through this, so an
 * English page is cached exactly like its Greek one. Before, only the
 * unprefixed paths had rules and every `/en/**` page was rendered in full
 * on each request — at the origin and, since nothing marked it, never at
 * the Cloudflare edge either.
 */
export function withLocalePrefixes(route: string): string[] {
  return [
    route,
    ...PREFIXED_LOCALES.map(locale =>
      route === '/' ? `/${locale}` : `/${locale}${route}`),
  ]
}

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
  // The public offers listing: prices, so the catalogue's TTL. Django's
  // ``promotions`` surface purges it on a promotion edit.
  '/offers': 300,
  // The programme's rules from the tenant's loyalty settings; the
  // visitor's own points live in the account pages, never here.
  '/loyalty-program': 600,
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
const CONTENT_SWR_TTL = 600
const CATALOG_SWR_TTL = 300

export const SWR_ROUTE_PATTERN_RULES: Readonly<Record<string, number>> = {
  // A glob does not match its own prefix, so the bare path is listed too.
  '/blog': BLOG_SWR_TTL,
  '/blog/**': BLOG_SWR_TTL,
  '/products': CATALOG_SWR_TTL,
  '/products/**': CATALOG_SWR_TTL,
  // Merchant CMS pages (FAQ, shipping info); ``page_config`` purges them
  // when a content page is saved. No bare ``/info``: there is no index page
  // (only ``pages/info/[slug].vue``), and @nuxtjs/sitemap lists route-rule
  // paths, so a bare rule put a 404 into every store's sitemap.
  '/info/**': CONTENT_SWR_TTL,
}

/**
 * A merchant's custom pages: `app/pages/[slug].vue` serves each published
 * layout whose page type passes `isCustomPageSlug` at `/<slug>`
 * (`/kelari`, `/poies-eimaste`). Which slugs exist is tenant data, so no
 * route rule can list them, and a `/*` rule cannot stand in: Nitro matches
 * a rule by path, not by the page that renders it, so it would cache
 * `/cart`, `/checkout` and every other one-segment page too.
 *
 * Nor can `/*` plus `cache: false` on the app's own pages. Nitro 2 wraps a
 * HANDLER in the cache once, at start-up, from the rules of the handler's
 * route (nitropack `runtime/internal/app.mjs`), and gives a more specific
 * rule a handler of its own only when it sits under a cached `/**` rule
 * (`extendMiddlewareWithRuleOverlaps`, `WILDCARD_PATH_RE = /\/\*\*.*$/`
 * in `dist/rollup/index.mjs`). So `/search` with `cache: false` is still
 * answered by the cached `/*` handler: tried 2026-10-21, `/cart`,
 * `/en/cart` and `/search` all came back as cache replays.
 *
 * `server/handlers/custom-page.ts` answers these routes instead and lets
 * only a custom page into its cache (`isCachedSsrRoute`). Same
 * anonymous-render contract and TTL as `/info/**`, the other merchant CMS
 * pages.
 */
export const CUSTOM_PAGE_ROUTES: readonly string[] = withLocalePrefixes('/*')
export const CUSTOM_PAGE_SWR_TTL = CONTENT_SWR_TTL

/** Whether a locale-stripped, slash-trimmed path is a custom page. */
function isCustomPageRoute(clean: string): boolean {
  const segments = clean.split('/').filter(Boolean)
  return segments.length === 1 && isCustomPageSlug(segments[0])
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
  return hasExtractedPayload(path) || isCustomPageRoute(cleanRoute(path))
}

/**
 * Whether Nuxt extracts ``path``'s payload into a ``_payload.json``, the
 * file a client-side navigation to the page fetches.
 *
 * Nuxt renders a payload only for a route whose route rule caches it
 * (``routeOptions.isr || routeOptions.cache`` in its renderer), and the
 * client asks for one only where its own copy of the rules says so. Those
 * rules are the lists above (``nuxt.config.ts`` builds them from these
 * constants). A custom page is cached by ``server/handlers/custom-page.ts``
 * instead, with no rule, so its payload stays inline in the HTML and its
 * ``_payload.json`` is a 404 nobody asks for.
 */
export function hasExtractedPayload(path: string): boolean {
  const clean = cleanRoute(path)
  if (CACHED_SSR_ROUTES_SET.has(clean)) return true
  return SWR_PATTERN_PREFIXES.some(
    prefix => clean === prefix || clean.startsWith(`${prefix}/`),
  )
}

/**
 * ``path`` as the route lists above name it: ``/en/products`` is the
 * same cached page as ``/products``, in English. Only a NON-default
 * prefix is stripped: ``prefix_except_default`` never emits ``/el/...``,
 * so that path is not a page these lists describe.
 */
function cleanRoute(path: string): string {
  const { locale, route } = splitLocale(path)
  return locale === DEFAULT_LOCALE
    ? path.replace(/\/+$/, '') || '/'
    : route
}
