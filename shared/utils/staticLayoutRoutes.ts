/**
 * The page-config layouts a STATIC route renders, by page type, with the
 * route that renders each.
 *
 * Every other published layout is a custom page: the catch-all
 * `app/pages/[slug].vue` serves it at `/<pageType>` (`isCustomPageSlug`).
 * A page type in this map belongs to its route and nowhere else. The
 * catch-all used to serve the `home` layout at `/home` as well, a second
 * copy of `/` with its own canonical, on every store; now it refuses
 * these page types, and `nuxt.config.ts` moves `/<pageType>` to its
 * route with a 301 wherever the two differ (`/home` → `/`).
 *
 * `test/unit/source-rules/static-layout-routes.spec.ts` pins the map to
 * the pages: every page type a static page renders is here, under the
 * route that renders it, and nothing else is.
 */
export const STATIC_LAYOUT_ROUTES = {
  'home': '/',
  'products': '/products',
  'blog': '/blog',
  'contact': '/contact',
  'feedback': '/feedback',
  'about': '/about',
  'vision': '/vision',
  'what-is-microlearning': '/what-is-microlearning',
  'why-microlearning': '/why-microlearning',
} as const satisfies Readonly<Record<string, `/${string}`>>

export type StaticLayoutPageType = keyof typeof STATIC_LAYOUT_ROUTES

export function isStaticLayoutPageType(pageType: string): pageType is StaticLayoutPageType {
  return Object.hasOwn(STATIC_LAYOUT_ROUTES, pageType)
}
