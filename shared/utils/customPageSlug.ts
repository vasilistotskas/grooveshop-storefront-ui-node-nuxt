import { SUPPORTED_LOCALES } from '../../i18n/locales.ts'
import { isStaticLayoutPageType } from './staticLayoutRoutes.ts'

/**
 * First path segments that something other than a custom page answers on
 * a storefront host, so a layout named after one could never be served
 * at `/<name>`:
 *
 * - the top-level routes in `app/pages` and `server/routes`, the server
 *   API and the directories in `public/`
 *   (`test/unit/source-rules/static-layout-routes.spec.ts` reads them
 *   from disk and fails on any this set misses);
 * - the locale prefixes: `/en` is a home page;
 * - the agent gateway's paths, which each store's ingress routes to the
 *   gateway before the storefront sees them
 *   (grooveshop-infrastructure, `overlays/<env>/tenants/<store>/ingress.yaml`).
 *
 * A segment with a dot or an underscore (`rss.xml`, `_nuxt`, `_health`)
 * already fails the slug format and needs no entry.
 */
const RESERVED_SEGMENTS: ReadonlySet<string> = new Set([
  // app/pages
  'about',
  'alerts',
  'account',
  'blog',
  'cart',
  'checkout',
  'contact',
  'cookies-policy',
  'feedback',
  'gift-cards',
  'info',
  'loyalty-program',
  'newsletter',
  'offers',
  'privacy-policy',
  'products',
  'return-policy',
  'search',
  'terms-of-use',
  'vision',
  'what-is-microlearning',
  'why-microlearning',
  // server/routes and server/api
  'auth',
  'api',
  // public/
  'img',
  'platform-favicon',
  'screenshots',
  // the agent gateway
  'acp',
  'chat',
  'feeds',
  'mcp',
  ...SUPPORTED_LOCALES,
])

/**
 * Whether `slug` names a custom page: a plain lowercase-kebab segment
 * that no static route, locale or service already answers, and that is
 * not a page type a static route renders (`STATIC_LAYOUT_ROUTES`).
 *
 * The catch-all `/[slug]` page uses it as its `validate`, so anything
 * else is a 404 before a layout is fetched, and the sitemap lists a
 * published layout at `/<pageType>` only when it passes.
 */
export function isCustomPageSlug(slug: unknown): slug is string {
  return typeof slug === 'string'
    && /^[a-z0-9-]+$/.test(slug)
    && !RESERVED_SEGMENTS.has(slug)
    && !isStaticLayoutPageType(slug)
}
