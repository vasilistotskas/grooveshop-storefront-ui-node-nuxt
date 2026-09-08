/**
 * Read a boolean merchant `extra_settings` value for ONE tenant, from
 * a Nitro route that has no tenant context of its own.
 *
 * The sitemap and feed routes are bypassed in
 * `server/middleware/0.tenant.ts` (@nuxtjs/sitemap hits them at
 * build/SWR time with no real Host), so they resolve the tenant
 * themselves and cannot use the request-scoped readers — hence the
 * explicit `host`, forwarded as `X-Forwarded-Host` so Django resolves
 * the right schema instead of answering from the public one.
 *
 * Fails CLOSED, unlike `app/utils/settingEnabled.ts`, which route
 * middleware uses and which fails OPEN. The asymmetry is deliberate:
 * a middleware that fails open costs one rendered page, while a feed
 * that fails open PUBLISHES a URL the same gate then 404s — the
 * defect these callers exist to prevent.
 */
export async function settingEnabledForHost(
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
        headers: host ? { 'X-Forwarded-Host': host } : undefined,
      },
    )
    // The same truthiness the app-side reader accepts: a setting
    // stored as `1` or `yes` is enabled, not merely not-`true`.
    const raw = (setting?.value ?? 'false').toString().toLowerCase()
    return raw === 'true' || raw === '1' || raw === 'yes'
  }
  catch {
    return false
  }
}
