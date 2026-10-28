import { splitLocale } from '~~/shared/i18n/localeFromPath'

/**
 * The storefront routes a tenant may have switched off, and the rule
 * that says whether one is serving: ONE rule, read by everything that
 * advertises a link to them.
 *
 * Each of these pages already decides for itself, in its route
 * middleware, whether to render or 404. This table is that decision
 * written down once, so the sitemap (`server/plugins/sitemap-tenant-
 * gate.ts`) and the navigation menus (`useNavigation`) cannot disagree
 * with the page: a footer link to `/offers` on a store with promotions
 * off is a 404 the store advertises on every page, and a sitemap that
 * lists it is a 4XX in Search Console.
 *
 * The rule is Django's: a route serves when `TenantConfig.features`
 * says its feature is on (`storeFeatureOn`). No per-route fallback: it is
 * in the tenant payload.
 */
export interface FeatureGatedRoute {
  /** Path without a locale prefix, as the route manifest names it. */
  path: string
  /** The store features the route needs, all of them on. */
  features?: readonly StoreFeatureName[]
}

export const FEATURE_GATED_ROUTES: readonly FeatureGatedRoute[] = [
  { path: '/loyalty-program', features: ['loyalty'] },
  { path: '/offers', features: ['promotions'] },
  // Gift cards are bought from the catalogue (`app/pages/gift-cards`).
  { path: '/gift-cards', features: ['giftCards', 'catalogue'] },
  { path: '/account/gift-cards', features: ['giftCards', 'catalogue'] },
  { path: '/products', features: ['catalogue'] },
  { path: '/feedback', features: ['feedback'] },
  { path: '/blog', features: ['blog'] },
  { path: '/blog/categories', features: ['blog'] },
]

/** Whether ONE gated route is serving for a tenant. */
export function featureRouteAllowed(
  route: FeatureGatedRoute,
  tenant: Pick<TenantConfig, 'features'> | null | undefined,
): boolean {
  return (route.features ?? []).every(feature => storeFeatureOn(tenant, feature))
}

/** The paths that are NOT serving for a tenant, ready for lookups. */
export function blockedFeaturePaths(
  tenant: Pick<TenantConfig, 'features'> | null | undefined,
): ReadonlySet<string> {
  return new Set(
    FEATURE_GATED_ROUTES.filter(
      route => !featureRouteAllowed(route, tenant),
    ).map(route => route.path),
  )
}

/**
 * Whether a link's path lands on a blocked route.
 *
 * Compared with the locale prefix stripped, because menu rows carry
 * their paths verbatim from Django while everything rendered goes
 * through `localePath()`. Matched on a segment boundary: a blocked
 * `/products` also blocks `/products/category/5/x` — the same
 * middleware guards the whole subtree — but not a hypothetical
 * `/products-guide`.
 */
export function isFeaturePathBlocked(
  path: string,
  blocked: ReadonlySet<string>,
): boolean {
  const { route } = splitLocale(path)
  for (const prefix of blocked) {
    if (route === prefix || route.startsWith(`${prefix}/`)) return true
  }
  return false
}
