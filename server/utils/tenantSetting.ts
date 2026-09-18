/**
 * Read a tenant's public merchant `extra_settings` from a Nitro route
 * that has no tenant context of its own.
 *
 * The sitemap and feed routes are bypassed in
 * `server/middleware/0.tenant.ts` (@nuxtjs/sitemap hits them at
 * build/SWR time with no real Host), so they resolve the tenant
 * themselves and cannot use the request-scoped readers — hence the
 * explicit `host`, forwarded as `X-Forwarded-Host` so Django resolves
 * the right schema instead of answering from the public one.
 *
 * One bulk read (`settings/public`) rather than one round trip per
 * key: a sitemap resolve consults several gates, and the storefront's
 * per-key reads are what saturated it under a crawler (2026-09-11).
 *
 * Fails CLOSED, unlike `app/utils/settingEnabled.ts`, which route
 * middleware uses and which fails OPEN. The asymmetry is deliberate:
 * a middleware that fails open costs one rendered page, while a feed
 * that fails open PUBLISHES a URL the same gate then 404s — the
 * defect these callers exist to prevent. `null` is the closed signal.
 */
export async function publicSettingsForHost(
  host: string,
  apiBaseUrl: string,
): Promise<Readonly<Record<string, string>> | null> {
  try {
    const { settings } = await $fetch<PublicSettings>(
      `${apiBaseUrl}/settings/public`,
      {
        method: 'GET',
        headers: host ? { 'X-Forwarded-Host': host } : undefined,
      },
    )
    return settings
  }
  catch {
    return null
  }
}

/**
 * Whether ONE boolean setting is on for the host — the same
 * `parseSettingFlag` rule every other reader applies. A missing row
 * and an unreadable endpoint both read as off (see above).
 */
export async function settingEnabledForHost(
  host: string,
  apiBaseUrl: string,
  key: string,
): Promise<boolean> {
  const settings = await publicSettingsForHost(host, apiBaseUrl)
  return settings ? parseSettingFlag(settings[key], false) : false
}

/**
 * Whether this tenant has a PUBLISHED page-config layout for a pageType.
 *
 * `/about`, `/vision`, `/what-is-microlearning` and `/why-microlearning`
 * are static routes in the build-time manifest, so every tenant's
 * sitemap advertised all four — but each renders a `page_config` layout
 * and throws a hard 404 when the tenant has not published one. Only
 * webside has them, so the other three production tenants listed three
 * or four 404s each.
 *
 * Django answers 404 for "no published layout", which is the documented
 * normal state rather than a fault (see
 * `server/api/page-config/[pageType].get.ts`). One read per gated
 * pageType because there is no bulk endpoint; the caller runs them in
 * parallel and the sitemap response is cached for a day.
 *
 * Fails CLOSED, like its neighbours here.
 */
export async function pageTypePublishedForHost(
  host: string,
  apiBaseUrl: string,
  pageType: string,
): Promise<boolean> {
  try {
    const layout = await $fetch<{ isPublished?: boolean } | null>(
      `${apiBaseUrl}/page-config/${pageType}`,
      {
        method: 'GET',
        headers: host ? { 'X-Forwarded-Host': host } : undefined,
      },
    )
    return layout?.isPublished === true
  }
  catch {
    return false
  }
}

/**
 * Every PUBLISHED ContentPage slug this tenant has, and the locales it
 * exists in.
 *
 * Which legal documents a store actually has is per-tenant data, and no
 * build-time list can answer it: `/terms-of-use` and friends are static
 * routes that exist for every tenant, but they render the tenant's own
 * ContentPage and answer 404 when there is none. Three of the four
 * production tenants have no `return-policy` page.
 *
 * The LOCALES matter for the same reason one layer down. A page is
 * translated per locale, and on a locale it is not written in the legal
 * route renders it in the language it exists in with a canonical
 * pointing at THAT locale's URL — so `/en/terms-of-use` on a store with
 * a Greek-only document is a non-canonical duplicate (delta-sigma's
 * state), and a sitemap lists canonical URLs only. The row's
 * `translations` keys are exactly the locales that are canonical.
 *
 * The API returns only published rows to an anonymous caller, so
 * membership here is exactly "this route resolves for this tenant, in
 * this locale". `pageSize` is explicit because the endpoint's default
 * page is 12.
 *
 * Fails CLOSED like {@link publicSettingsForHost}, and for the same
 * reason — a feed that fails open publishes a URL its own gate then
 * 404s. `null` is the closed signal.
 */
export async function publishedContentLocalesForHost(
  host: string,
  apiBaseUrl: string,
): Promise<ReadonlyMap<string, ReadonlySet<string>> | null> {
  try {
    const { results } = await $fetch<{
      results: { slug: string, translations?: Record<string, unknown> | null }[]
    }>(
      `${apiBaseUrl}/content-page`,
      {
        method: 'GET',
        query: { pageSize: 100 },
        headers: host ? { 'X-Forwarded-Host': host } : undefined,
      },
    )
    return new Map(
      results.map(page => [
        page.slug,
        new Set(Object.keys(page.translations ?? {})),
      ]),
    )
  }
  catch {
    return null
  }
}
