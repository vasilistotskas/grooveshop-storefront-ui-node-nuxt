import { splitLocale } from '~~/shared/i18n/localeFromPath'
import { parseSettingFlag } from '~~/shared/utils/settingFlag'
import { STORE_PREFERENCES } from '~~/shared/utils/storePreference'

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
 * The rule is Django's: a route behind a store feature serves when
 * `TenantConfig.features` says the feature is on (`storeFeatureOn`),
 * with no per-route fallback. The one exception is the catalogue,
 * which is a preference until the API gates it (see
 * `shared/utils/storePreference.ts`): its page renders when the
 * settings lookup itself fails, so the table does too, and a missing
 * row means the preference's default.
 */
export interface FeatureGatedRoute {
  /** Path without a locale prefix, as the route manifest names it. */
  path: string
  /** The store feature the route belongs to. */
  feature?: StoreFeatureName
  /** The preference that gates it, for the routes that are not a feature yet. */
  preference?: StorePreferenceName
}

export const FEATURE_GATED_ROUTES: readonly FeatureGatedRoute[] = [
  { path: '/loyalty-program', feature: 'loyalty' },
  { path: '/offers', feature: 'promotions' },
  { path: '/gift-cards', feature: 'giftCards' },
  { path: '/products', preference: 'CATALOGUE_ENABLED' },
  { path: '/feedback', feature: 'feedback' },
  { path: '/blog', feature: 'blog' },
  { path: '/blog/categories', feature: 'blog' },
]

/**
 * Whether ONE gated route is serving for a tenant.
 *
 * `settings` is `null` when the lookup itself failed, which the
 * preference's route middleware treats as "render" (an outage must not
 * take the shop down). Features never read it.
 */
export function featureRouteAllowed(
  route: FeatureGatedRoute,
  tenant: Pick<TenantConfig, 'features'> | null | undefined,
  settings: Readonly<Record<string, string>> | null,
): boolean {
  if (route.feature && !storeFeatureOn(tenant, route.feature)) return false
  if (!route.preference) return true
  if (settings === null) return true
  return parseSettingFlag(
    settings[route.preference],
    STORE_PREFERENCES[route.preference],
  )
}

/** The paths that are NOT serving for a tenant, ready for lookups. */
export function blockedFeaturePaths(
  tenant: Pick<TenantConfig, 'features'> | null | undefined,
  settings: Readonly<Record<string, string>> | null,
): ReadonlySet<string> {
  return new Set(
    FEATURE_GATED_ROUTES.filter(
      route => !featureRouteAllowed(route, tenant, settings),
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
