import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '~~/i18n/locales'
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
 * already gates blog URLs on `tenant.blogEnabled`; this closes the same
 * hole for static routes.
 */
interface GatedRoute {
  /** Path as it appears in the sitemap, without locale prefix. */
  path: string
  /** Commercial gate — the tenant's plan flag. */
  planFlag: (tenant: TenantConfig) => boolean
  /** Operational gate — the merchant's `extra_settings` key. */
  settingKey: string
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
]

// `/en`, `/en/`, `/en/products`, `/en-us/products` — the home page of a
// prefixed locale carries no further segment, which a `(?=\/)` lookahead
// alone would miss.
const LOCALE_PREFIX_RE = /^\/([a-z]{2})(?:-[a-z]{2})?(?=\/|$)/i

/**
 * Split a sitemap path into the locale it is for and the route beneath
 * it.
 *
 * The prefix is checked against `SUPPORTED_LOCALES` rather than trusted
 * as "any two letters": a genuine top-level route that happens to be
 * two characters long (`/eu/policy`) would otherwise be read as a
 * locale prefix — gated as the wrong locale AND matched against the
 * gated-route table as `/policy`. No prefix means the default locale,
 * which is what `prefix_except_default` emits.
 */
function splitLocale(path: string): { locale: string, route: string } {
  const withoutTrailingSlash = path.replace(/\/$/, '') || '/'
  const candidate = withoutTrailingSlash
    .match(LOCALE_PREFIX_RE)?.[1]
    ?.toLowerCase()
  if (
    !candidate
    || !(SUPPORTED_LOCALES as readonly string[]).includes(candidate)
  ) {
    return { locale: DEFAULT_LOCALE, route: withoutTrailingSlash }
  }
  return {
    locale: candidate,
    route: withoutTrailingSlash.replace(LOCALE_PREFIX_RE, '') || '/',
  }
}

/**
 * The language an `hreflang` names, or the default locale for
 * `x-default` — which points at the default-locale URL and is therefore
 * always served.
 */
function languageOf(hreflang: string | undefined): string {
  const tag = (hreflang ?? '').toLowerCase()
  if (!tag || tag === 'x-default') return DEFAULT_LOCALE
  return tag.split('-')[0] ?? DEFAULT_LOCALE
}

function pathOf(loc: string | URL | undefined): string {
  const raw = typeof loc === 'string' ? loc : loc?.toString() ?? ''
  if (!raw) return ''
  // `loc` is still a path here (normaliseEntry absolutizes AFTER this
  // hook), but tolerate an absolute one either way.
  return raw.startsWith('http') ? new URL(raw).pathname : raw
}

async function isSettingEnabled(
  host: string,
  apiBaseUrl: string,
  key: string,
): Promise<boolean> {
  try {
    const setting = await $fetch<{ value?: string }>(
      `${apiBaseUrl}/settings/get`,
      {
        method: 'GET',
        query: { key },
        // Django resolves the tenant schema from this header; without it
        // every tenant would inherit the public schema's flag value.
        headers: host ? { 'X-Forwarded-Host': host } : undefined,
      },
    )
    return (setting?.value ?? 'false').toLowerCase() === 'true'
  }
  catch {
    // Fail CLOSED, unlike the route middleware. A middleware that fails
    // open costs one rendered page; a sitemap that fails open publishes
    // a URL the same gate will 404 — the defect this exists to prevent.
    return false
  }
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

    const allowed = await Promise.all(
      GATED_ROUTES.map(async (route) => {
        if (!route.planFlag(tenant)) return false
        return isSettingEnabled(host, apiBaseUrl, route.settingKey)
      }),
    )

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
        : url.alternatives.filter(alt => locales.has(languageOf(alt.hreflang)))
      return [{ ...url, alternatives }]
    })
  })
})
