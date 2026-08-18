/**
 * Derive the path portion of the Media Stream service URL (e.g.
 * ``/media_stream-image``) from a full origin+path env value such as
 * ``NUXT_PUBLIC_MEDIA_STREAM_PATH``.
 *
 * The path segment is a fixed route on the media-stream service — never
 * tenant-configurable. Only the ORIGIN varies per tenant
 * (``TenantConfig.assetsDomain``), so callers building a tenant-scoped
 * media-stream base URL reuse this path against the tenant's own host:
 * ``https://${assetsDomain}${extractMediaStreamPath(...)}``.
 */
export function extractMediaStreamPath(
  fullUrl: string | undefined,
  fallback = '/media_stream-image',
): string {
  if (!fullUrl) return fallback
  if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
    return fullUrl || fallback
  }
  try {
    return new URL(fullUrl).pathname || fallback
  }
  catch {
    const match = fullUrl.match(/https?:\/\/[^/]+(\/.*)/)
    return match?.[1] || fallback
  }
}
