/**
 * Drop feature-gated static routes from a tenant's sitemap.
 *
 * @nuxtjs/sitemap discovers static pages from the route manifest, a
 * build-time pass with no tenant context — so every tenant's sitemap
 * advertised every gated page, including the ones whose route
 * middleware answers a hard 404. webside.gr shipped `/loyalty-program`
 * while `LOYALTY_ENABLED` was false (Ahrefs: "4XX page in sitemap",
 * "404 page").
 *
 * `sitemap.exclude` cannot express this: it is a static path filter
 * applied to the final URL set, so it would also drop the route for the
 * tenants that legitimately have the feature on. The `sitemap:resolved`
 * hook is the only place that sees both the resolved URL list AND the
 * request, which is what tenant resolution needs.
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

/**
 * Drop a leading locale segment so the path can be matched literally.
 *
 * Only `el` is active today and it is the default locale, so
 * @nuxtjs/i18n emits unprefixed paths. Activating a second locale adds
 * `/en/...` variants to the sitemap, and a gate that matched only the
 * bare path would silently start leaking the 404 again.
 */
function stripLocalePrefix(path: string): string {
  const withoutTrailingSlash = path.replace(/\/$/, '') || '/'
  return withoutTrailingSlash.replace(/^\/[a-z]{2}(-[a-z]{2})?(?=\/)/i, '')
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
    if (!blocked.size) return

    ctx.urls = ctx.urls.filter((url) => {
      const loc = typeof url === 'string' ? url : url.loc
      if (!loc) return true
      // `loc` is still a path here (normaliseEntry absolutizes AFTER this
      // hook), but tolerate an absolute one either way.
      const path = loc.startsWith('http') ? new URL(loc).pathname : loc
      return !blocked.has(stripLocalePrefix(path))
    })
  })
})
