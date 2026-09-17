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
 * The slugs of every ContentPage this tenant has PUBLISHED.
 *
 * Which legal documents a store actually has is per-tenant data, and no
 * build-time list can answer it: `/terms-of-use` and friends are static
 * routes that exist for every tenant, but they render the tenant's own
 * ContentPage and answer 404 when there is none. Three of the four
 * production tenants have no `return-policy` page.
 *
 * The API returns only published rows to an anonymous caller, so
 * membership of this set is exactly "this route resolves for this
 * tenant". `pageSize` is explicit because the endpoint's default page
 * is 12.
 *
 * Fails CLOSED like {@link publicSettingsForHost}, and for the same
 * reason — a feed that fails open publishes a URL its own gate then
 * 404s. `null` is the closed signal.
 */
export async function publishedContentSlugsForHost(
  host: string,
  apiBaseUrl: string,
): Promise<ReadonlySet<string> | null> {
  try {
    const { results } = await $fetch<{ results: { slug: string }[] }>(
      `${apiBaseUrl}/content-page`,
      {
        method: 'GET',
        query: { pageSize: 100 },
        headers: host ? { 'X-Forwarded-Host': host } : undefined,
      },
    )
    return new Set(results.map(page => page.slug))
  }
  catch {
    return null
  }
}
