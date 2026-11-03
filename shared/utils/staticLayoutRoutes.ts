export interface StaticLayoutRoute {
  /** The route that renders the page type's layout. */
  readonly path: `/${string}`
  /**
   * Whether the route answers 404 until the store publishes the page.
   * The others render their own content with or without one and exist
   * on every store.
   */
  readonly requiresLayout: boolean
  /**
   * The designs the page type exists for (tenant schemas, as a block's
   * `designs`); none named means every design. A page type whose content
   * belongs to one design's own sections is declared so, and the other
   * stores' catalogue does not list it as a template.
   */
  readonly designs?: readonly string[]
}

/**
 * The builder pages a STATIC route renders, by page type, with the
 * route that renders each.
 *
 * Every other published layout is a custom page: the catch-all
 * `app/pages/[slug].vue` serves it at `/<pageType>` (`isCustomPageSlug`),
 * and the sitemap lists it there. A page type in this map belongs to its
 * route and nowhere else. The catch-all used to serve the `home` layout
 * at `/home` as well, a second copy of `/` with its own canonical, on
 * every store; now it refuses these page types, and `nuxt.config.ts`
 * moves `/<pageType>` to its route with a 301 wherever the two differ
 * (`/home` → `/`).
 *
 * `test/unit/source-rules/static-layout-routes.spec.ts` pins the map to
 * the pages: every page type a static page renders is here, under the
 * route that renders it, `requiresLayout` exactly for the pages whose
 * body answers 404 without one, and nothing else is.
 */
export const STATIC_LAYOUT_ROUTES = {
  'home': { path: '/', requiresLayout: false },
  'products': { path: '/products', requiresLayout: false },
  'blog': { path: '/blog', requiresLayout: false },
  'blog-post': { path: '/blog', requiresLayout: false },
  'contact': { path: '/contact', requiresLayout: false },
  'feedback': { path: '/feedback', requiresLayout: false },
  'about': { path: '/about', requiresLayout: true, designs: ['webside'] },
  'vision': { path: '/vision', requiresLayout: true, designs: ['webside'] },
  'what-is-microlearning': { path: '/what-is-microlearning', requiresLayout: true, designs: ['webside'] },
  'why-microlearning': { path: '/why-microlearning', requiresLayout: true, designs: ['webside'] },
} as const satisfies Readonly<Record<string, StaticLayoutRoute>>

export type StaticLayoutPageType = keyof typeof STATIC_LAYOUT_ROUTES

/**
 * The page types a design has: every one that names no `designs` and every
 * one that names `design`. Without a design, all of them.
 */
export function staticLayoutPageTypesFor(design?: string): StaticLayoutPageType[] {
  return (Object.keys(STATIC_LAYOUT_ROUTES) as StaticLayoutPageType[]).filter((pageType) => {
    const { designs }: StaticLayoutRoute = STATIC_LAYOUT_ROUTES[pageType]
    return design === undefined || designs === undefined || designs.includes(design)
  })
}

export function isStaticLayoutPageType(pageType: string): pageType is StaticLayoutPageType {
  return Object.hasOwn(STATIC_LAYOUT_ROUTES, pageType)
}
