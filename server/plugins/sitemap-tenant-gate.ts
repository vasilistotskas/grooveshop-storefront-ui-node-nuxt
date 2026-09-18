import { SUPPORTED_LOCALES } from '~~/i18n/locales'
import { splitLocale } from '~~/shared/i18n/localeFromPath'
import { languageOfLocaleTag } from '~~/shared/i18n/localeTag'
import { tenantAllowedLocales } from '~~/shared/i18n/tenantLocales'
import {
  FEATURE_GATED_ROUTES,
  featureRouteAllowed,
  type FeatureGatedRoute,
  type PlanFlags,
} from '~~/shared/utils/gatedRoutes'

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
interface GatedRoute extends FeatureGatedRoute {
  /**
   * Content gate — the ContentPage slug this route renders.
   *
   * The legal routes exist in the route manifest for every tenant but
   * render that tenant's own ContentPage, so they answer 404 wherever
   * the merchant has not published one. That is not a flag or a
   * setting, it is whether a row exists, which only the API can say.
   */
  contentSlug?: string
  /**
   * Layout gate — the `page_config` pageType this route renders.
   *
   * Same shape as `contentSlug` one layer over: the route exists for
   * every tenant and throws a hard 404 where no layout is published.
   */
  pageType?: string
}

// The feature gates are the ONE table the navigation menus also read
// (`shared/utils/gatedRoutes.ts`), so a sitemap entry and a footer
// link can never disagree with the page they point at. Any gated page
// that is INDEXABLE belongs in that table, or its URL 404s here for
// every tenant with the feature off (the offers page was missing once:
// Ahrefs 2026-09-11, "4XX page in sitemap", webside.gr/offers). The
// table also carries noindex routes — /gift-cards, /feedback — for the
// menus' sake; they never reach this hook, because the module drops
// non-indexable routes before it runs. `/search` is not listed at all
// for the same reason. The DYNAMIC product, category and blog URLs are
// gated on the same flags in `server/api/__sitemap__/urls.ts`.
const GATED_ROUTES: readonly GatedRoute[] = [
  ...FEATURE_GATED_ROUTES,
  // The legal routes. Each renders the tenant's ContentPage at its
  // slug and throws a 404 when there is none (see useLegalPage), so a
  // store's sitemap must list exactly the documents that store has.
  // `/return-policy` is the live case: it is seeded UNPUBLISHED for a
  // new tenant, because only the merchant can write a returns policy,
  // and three of the four production tenants answer 404 there today.
  //
  // Derived from LEGAL_ROUTE_SLUGS rather than typed out, so adding a
  // legal route cannot forget to gate it.
  ...Object.entries(LEGAL_ROUTE_SLUGS).map(([route, slug]) => ({
    path: `/${route}`,
    contentSlug: slug,
  })),
  // The layout-driven static routes. Each calls `usePageConfig` and
  // throws a hard 404 when the tenant has published no layout, and only
  // webside has any of them — `seed_brand_pages` publishes its brand
  // pages together with the footer menu that links them. Every other
  // tenant was advertising three or four 404s: demo and fyteia listed
  // /vision, /what-is-microlearning and /why-microlearning; delta-sigma
  // listed those plus /about, once per locale it serves.
  //
  // Only the four that 404. The other `usePageConfig` pages (home,
  // products, blog, contact, feedback) render FALLBACK_LAYOUTS and
  // answer 200 without one, so they belong in every sitemap.
  { path: '/about', pageType: 'about' },
  { path: '/vision', pageType: 'vision' },
  { path: '/what-is-microlearning', pageType: 'what-is-microlearning' },
  { path: '/why-microlearning', pageType: 'why-microlearning' },
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

    const plan: PlanFlags = {
      loyaltyEnabled: tenant.loyaltyEnabled,
      blogEnabled: tenant.blogEnabled,
      promotionsEnabled: tenant.promotionsEnabled,
      giftCardsEnabled: tenant.giftCardsEnabled,
    }
    const planAllows = (route: GatedRoute) =>
      !route.planFlag || plan[route.planFlag]

    // One bulk read of the store's public settings for every route
    // whose plan gate passed — and none at all when no route needs
    // one. `null` means the lookup itself failed, and the shared rule
    // then ALLOWS, because every route middleware renders on that
    // failure: this feed used to fail closed there and list fewer URLs
    // than the store was serving. What a missing KEY means is the
    // route's own fallback, also in the table.
    const needsSettings = GATED_ROUTES.some(
      route => planAllows(route) && route.settingKey,
    )
    const settings = needsSettings
      ? await publicSettingsForHost(host, apiBaseUrl)
      : null

    // Same shape for the content gate: one bulk read, and only when a
    // route whose earlier gates passed actually needs it.
    const needsContent = GATED_ROUTES.some(
      route => planAllows(route) && route.contentSlug,
    )
    const contentLocales = needsContent
      ? await publishedContentLocalesForHost(host, apiBaseUrl)
      : null

    // One read per gated pageType — there is no bulk endpoint — run in
    // parallel, and only for the routes whose earlier gates passed.
    const layoutRoutes = GATED_ROUTES.filter(
      route => planAllows(route) && route.pageType,
    )
    const layoutPublished = new Map<string, boolean>(
      await Promise.all(
        layoutRoutes.map(async route =>
          [
            route.pageType!,
            await pageTypePublishedForHost(host, apiBaseUrl, route.pageType!),
          ] as const,
        ),
      ),
    )

    const allowed = GATED_ROUTES.map((route) => {
      if (!planAllows(route)) return false
      if (route.settingKey && !featureRouteAllowed(route, plan, settings)) {
        return false
      }
      if (route.contentSlug) {
        return contentLocales?.has(route.contentSlug) ?? false
      }
      if (route.pageType) {
        return layoutPublished.get(route.pageType) ?? false
      }
      return true
    })

    const blocked = new Set(
      GATED_ROUTES.filter((_, i) => !allowed[i]).map(route => route.path),
    )

    const locales = new Set(tenantAllowedLocales(tenant))

    // A content-backed route that survived the gate above is CANONICAL
    // only in the locales its document is translated into. On the
    // others the page renders the document in the language it exists
    // in, marked as such, with its canonical pointing at that locale's
    // URL — a non-canonical duplicate, and a sitemap lists canonical
    // URLs only. (It was a plain 404 before the fallback shipped;
    // delta-sigma listed three of them.)
    //
    // Only routes MISSING one of the locales the tenant serves are
    // recorded, so a fully translated store adds nothing here and the
    // early return below still applies to it.
    const routeLocales = new Map<string, ReadonlySet<string>>(
      GATED_ROUTES.flatMap((route, i) => {
        if (!allowed[i] || !route.contentSlug) return []
        const available = contentLocales?.get(route.contentSlug)
        if (!available) return []
        const coversAll = [...locales].every(l => available.has(l))
        return coversAll ? [] : [[route.path, available] as const]
      }),
    )

    // Nothing gated, nothing locale-restricted, and every platform
    // locale served: leave the list as the module built it.
    if (
      !blocked.size
      && !routeLocales.size
      && locales.size === SUPPORTED_LOCALES.length
    ) return

    ctx.urls = ctx.urls.flatMap((url) => {
      const path = pathOf(typeof url === 'string' ? url : url.loc)
      if (!path) return [url]
      const { locale, route } = splitLocale(path)
      if (blocked.has(route)) return []
      if (!locales.has(locale)) return []
      // The document exists but not in THIS language.
      const available = routeLocales.get(route)
      if (available && !available.has(locale)) return []
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
      // A document the tenant serves in only ONE of its locales is the
      // same case one layer down: dropping `/en/terms-of-use` from the
      // url set left the surviving `/terms-of-use` still advertising an
      // `en` alternate pointing at it — an alternate that renders the
      // Greek document under a canonical back to this one. The locale
      // gate above cannot catch it: the tenant genuinely serves `en`,
      // this document just does not exist in it. The page head withholds
      // the same alternate (`useDocumentLocales`).
      const kept = locales.size < 2
        ? []
        : url.alternatives.filter((alt) => {
            const altLocale = languageOfLocaleTag(alt.hreflang)
            if (!locales.has(altLocale)) return false
            return !available || available.has(altLocale)
          })

      // An hreflang set that points at one URL says nothing — it is a
      // page declaring itself its own alternate. Counted on distinct
      // hrefs rather than entries because `x-default` duplicates the
      // default locale's href by design.
      const alternatives
        = new Set(kept.map(alt => alt.href)).size > 1 ? kept : undefined
      return [{ ...url, alternatives }]
    })
  })
})
