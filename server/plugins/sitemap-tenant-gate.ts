import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import { splitLocale } from '~~/shared/i18n/localeFromPath'
import { languageOfLocaleTag } from '~~/shared/i18n/localeTag'
import { tenantAllowedLocales } from '~~/shared/i18n/tenantLocales'

/**
 * Drop what a tenant's sitemap must not advertise: feature-gated routes
 * it has switched off, and locales it does not serve.
 *
 * @nuxtjs/sitemap discovers static pages from the route manifest, a
 * build-time pass with no tenant context — so every tenant's sitemap
 * advertised every gated page, including the ones whose route
 * middleware answers a hard 404. webside.gr shipped `/loyalty-program`
 * while `LOYALTY_ENABLED` was false (Ahrefs: "4XX page in sitemap",
 * "404 page").
 *
 * The locale half is the same defect one layer up. `sitemaps: false`
 * suppresses the per-locale sitemap SPLIT and nothing else: read in
 * @nuxtjs/sitemap 8.3.4's `dist/module.mjs`, `canI18nMap` goes false
 * for it while `resolvedAutoI18n` is still auto-populated from the
 * build-time @nuxtjs/i18n config, and it is that object which adds the
 * locale-prefixed entries and their `hreflang` alternates inside the
 * single urlset. Locale availability is PER TENANT
 * (`Tenant.available_locales`), so the moment `en` shipped every
 * tenant's sitemap began advertising `/en/**` — including the four
 * that serve Greek only, where `app/middleware/
 * locale-available.global.ts` answers 404.
 *
 * `sitemap.autoI18n: false` would fix that by removing locales from
 * the sitemap for EVERYONE, including the tenant that legitimately has
 * two. Gating here instead keeps a bilingual tenant's `/en/**` listed
 * with correct alternates, and is the same trade the plan-flag gate
 * below already makes.
 *
 * `sitemap.exclude` cannot express either half: it is a static path
 * filter applied to the final URL set, so it would also drop the route
 * for the tenants that legitimately have the feature — or the locale —
 * on. The `sitemap:resolved` hook is the only place that sees both the
 * resolved URL list AND the request, which is what tenant resolution
 * needs.
 *
 * The dynamic half of the sitemap (`server/api/__sitemap__/urls.ts`)
 * gates blog URLs on `tenant.blogEnabled` and product URLs on
 * `CATALOGUE_ENABLED`; this closes the same hole for the static routes
 * that head each of those surfaces.
 */
interface GatedRoute {
  /** Path as it appears in the sitemap, without locale prefix. */
  path: string
  /**
   * Commercial gate — the tenant's plan flag. Optional: a surface can
   * be gated operationally only (the catalogue) or commercially only
   * (the blog), and a missing tier is not a closed one.
   */
  planFlag?: (tenant: TenantConfig) => boolean
  /** Operational gate — the merchant's `extra_settings` key. */
  settingKey?: string
}

// Mirrors the two-tier gate the route's middleware applies
// (app/middleware/loyalty-enabled.ts). Any gated page that is INDEXABLE
// needs an entry here, or its sitemap URL 404s for every tenant with the
// feature switched off. The other gated routes — /gift-cards,
// /gift-cards/success, /feedback — carry `defineRouteRules({ robots:
// false })`, and the module drops non-indexable routes before this hook
// runs, so they never reach a sitemap in the first place. Drop that
// noindex from one of them and it belongs in this table.
const GATED_ROUTES: readonly GatedRoute[] = [
  {
    path: '/loyalty-program',
    planFlag: tenant => tenant.loyaltyEnabled,
    settingKey: 'LOYALTY_ENABLED',
  },
  // The catalogue's own two indexable static routes. `/search` is not
  // here because it carries `robots: false` and never reaches a
  // sitemap; the DYNAMIC product and category URLs are gated on the
  // same setting in `server/api/__sitemap__/urls.ts`.
  { path: '/products', settingKey: 'CATALOGUE_ENABLED' },
  // The blog's, gated on the plan flag alone — there is no
  // extra_settings counterpart, `middleware/blog-enabled.ts` reads the
  // flag directly, and the dynamic post/category URLs already follow
  // it in `urls.ts`. Without these two entries a store with no blog
  // still advertised the index it 404s.
  { path: '/blog', planFlag: tenant => tenant.blogEnabled },
  { path: '/blog/categories', planFlag: tenant => tenant.blogEnabled },
  // The offers page is indexable and two-tier gated exactly like
  // loyalty (app/middleware/promotions-enabled.ts). It was missing
  // here, so every tenant with promotions off advertised a 404
  // (Ahrefs 2026-09-11, "4XX page in sitemap": webside.gr/offers).
  {
    path: '/offers',
    planFlag: tenant => tenant.promotionsEnabled,
    settingKey: 'PROMOTIONS_ENABLED',
  },
]

function pathOf(loc: string | URL | undefined): string {
  const raw = typeof loc === 'string' ? loc : loc?.toString() ?? ''
  if (!raw) return ''
  // `loc` is still a path here (normaliseEntry absolutizes AFTER this
  // hook), but tolerate an absolute one either way.
  return raw.startsWith('http') ? new URL(raw).pathname : raw
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('sitemap:resolved', async (ctx) => {
    const event = ctx.event
    if (!event) return

    const host = getRequestHost(event, { xForwardedHost: false })
    if (!host) return

    // The sitemap routes bypass server/middleware/0.tenant.ts, so resolve
    // the tenant here the same way urls.ts does. No tenant (platform
    // host, resolution failure) means no gating decision to make.
    let tenant = event.context.tenant as TenantConfig | undefined
    if (!tenant) {
      const result = await getTenantConfig(host)
      if (result.type !== 'ok') return
      tenant = result.config
    }

    const config = useRuntimeConfig()
    const apiBaseUrl = config.apiBaseUrl as string

    const planAllows = (route: GatedRoute) =>
      !route.planFlag || route.planFlag(tenant)

    // One bulk read of the store's public settings for every route
    // whose plan gate passed — and none at all when no route needs
    // one. `null` (unreadable) fails CLOSED: a feed must never
    // publish a URL its gate then 404s.
    const needsSettings = GATED_ROUTES.some(
      route => planAllows(route) && route.settingKey,
    )
    const settings = needsSettings
      ? await publicSettingsForHost(host, apiBaseUrl)
      : null

    const allowed = GATED_ROUTES.map((route) => {
      if (!planAllows(route)) return false
      if (!route.settingKey) return true
      return settings
        ? parseSettingFlag(settings[route.settingKey], false)
        : false
    })

    const blocked = new Set(
      GATED_ROUTES.filter((_, i) => !allowed[i]).map(route => route.path),
    )
    const locales = new Set(tenantAllowedLocales(tenant))
    // Nothing gated and every platform locale served: leave the list as
    // the module built it.
    if (!blocked.size && locales.size === SUPPORTED_LOCALES.length) return

    ctx.urls = ctx.urls.flatMap((url) => {
      const path = pathOf(typeof url === 'string' ? url : url.loc)
      if (!path) return [url]
      const { locale, route } = splitLocale(path)
      if (blocked.has(route)) return []
      if (!locales.has(locale)) return []
      if (typeof url === 'string' || !url.alternatives?.length) return [url]

      // An alternate for a locale this tenant does not serve points at
      // the same 404 the entry itself would have. And a single-language
      // tenant has nothing to alternate WITH — `hreflang` on a lone
      // self-referential URL is noise, so drop the list outright.
      //
      // Filtered on `hreflang`, not on the href's path prefix: the
      // hreflang is what the alternate CLAIMS to be, so it needs no
      // guessing, whereas `/de/x` and a real two-letter route `/eu/x`
      // are structurally identical.
      const alternatives = locales.size < 2
        ? undefined
        : url.alternatives.filter(alt => locales.has(languageOfLocaleTag(alt.hreflang)))
      return [{ ...url, alternatives }]
    })
  })
})
