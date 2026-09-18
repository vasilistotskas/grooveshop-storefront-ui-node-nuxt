import { splitLocale } from '~~/shared/i18n/localeFromPath'
import { parseSettingFlag } from '~~/shared/utils/settingFlag'

/**
 * The storefront routes a tenant may have switched off, and the rule
 * that says whether one is serving — ONE rule, read by everything that
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
 * The rule mirrors the middlewares exactly, including where they
 * disagree with each other:
 *
 * - a plan flag off is a hard no (`loyalty-enabled.ts`,
 *   `promotions-enabled.ts`, `gift-cards-enabled.ts`, `blog-enabled.ts`)
 * - a runtime setting is read with the route's OWN fallback for a
 *   missing key — the commercial gates fail closed, `createSettingGate`
 *   (catalogue, feedback) fails open
 * - every middleware lets the page render when the settings lookup
 *   itself fails, so an unreadable settings response allows here too.
 *   The sitemap used to fail closed in that case and list fewer routes
 *   than the store served; consistency with the page is the point.
 */
export interface FeatureGatedRoute {
  /** Path without a locale prefix, as the route manifest names it. */
  path: string
  /** Commercial gate — the tenant's plan flag, by TenantConfig key. */
  planFlag?: 'loyaltyEnabled' | 'blogEnabled' | 'promotionsEnabled' | 'giftCardsEnabled'
  /** Operational gate — the merchant's `extra_settings` key. */
  settingKey?: string
  /** What a MISSING setting means. Read from the route's middleware. */
  settingFallback?: boolean
}

export const FEATURE_GATED_ROUTES: readonly FeatureGatedRoute[] = [
  {
    path: '/loyalty-program',
    planFlag: 'loyaltyEnabled',
    settingKey: 'LOYALTY_ENABLED',
    settingFallback: false,
  },
  {
    path: '/offers',
    planFlag: 'promotionsEnabled',
    settingKey: 'PROMOTIONS_ENABLED',
    settingFallback: false,
  },
  {
    path: '/gift-cards',
    planFlag: 'giftCardsEnabled',
    settingKey: 'GIFT_CARDS_ENABLED',
    settingFallback: false,
  },
  // `createSettingGate`: a store that has never set the key serves the
  // page, so a link to it is fine.
  { path: '/products', settingKey: 'CATALOGUE_ENABLED', settingFallback: true },
  { path: '/feedback', settingKey: 'FEEDBACK_ENABLED', settingFallback: true },
  // The blog is gated on the plan flag alone; there is no setting.
  { path: '/blog', planFlag: 'blogEnabled' },
  { path: '/blog/categories', planFlag: 'blogEnabled' },
]

export type PlanFlags = Pick<
  Record<NonNullable<FeatureGatedRoute['planFlag']>, boolean>,
  NonNullable<FeatureGatedRoute['planFlag']>
>

/**
 * Whether ONE gated route is serving for a tenant.
 *
 * `settings` is `null` when the lookup itself failed, which every route
 * middleware treats as "render" — see the table's doc for why this
 * follows them rather than failing closed.
 */
export function featureRouteAllowed(
  route: FeatureGatedRoute,
  plan: PlanFlags,
  settings: Readonly<Record<string, string>> | null,
): boolean {
  if (route.planFlag && !plan[route.planFlag]) return false
  if (!route.settingKey) return true
  if (settings === null) return true
  return parseSettingFlag(
    settings[route.settingKey],
    route.settingFallback ?? false,
  )
}

/** The paths that are NOT serving for a tenant, ready for lookups. */
export function blockedFeaturePaths(
  plan: PlanFlags,
  settings: Readonly<Record<string, string>> | null,
): ReadonlySet<string> {
  return new Set(
    FEATURE_GATED_ROUTES.filter(
      route => !featureRouteAllowed(route, plan, settings),
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
