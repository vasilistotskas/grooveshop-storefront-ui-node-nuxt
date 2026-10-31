import { hasProtocol, joinURL } from 'ufo'

/**
 * Derive the path portion of the Media Stream service URL (e.g.
 * ``/media_stream-image``) from a full origin+path env value such as
 * ``NUXT_PUBLIC_MEDIA_STREAM_PATH``.
 *
 * The path segment is a fixed route on the media-stream service — never
 * tenant-configurable. Only the ORIGIN varies per tenant
 * (``TenantConfig.assetsDomain``); {@link mediaStreamBaseUrl} combines the two.
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

/**
 * The Media Stream base URL for one store: its own ``assetsDomain`` on the
 * service's fixed path, else the configured platform URL (an infra
 * endpoint, not a merchant credential, so that fallback is intentional).
 */
export function mediaStreamBaseUrl(
  assetsDomain: string | null | undefined,
  configuredUrl: string | undefined,
): string {
  if (assetsDomain) {
    return `https://${assetsDomain}${extractMediaStreamPath(configuredUrl)}`
  }
  return configuredUrl || ''
}

/**
 * Every segment of a Media Stream image URL after the source path. The
 * service's route makes each one mandatory
 * (``…/:width/:height/:fit/:position/:background/:trimThreshold/:quality.:format``);
 * a URL without them is a 404. ``0`` for width or height leaves that axis
 * unconstrained. Numeric fields accept strings because @nuxt/image's
 * ``ImageModifiers`` types them ``number | string``; they are written as given.
 */
export interface MediaStreamVariant {
  width: number | string
  height: number | string
  fit: string
  position: string
  background: string
  trimThreshold: number | string
  quality: number | string
  format: string
}

/**
 * The product image every search surface is given: the sitemap's
 * ``<image:loc>`` and the product's structured data. It is the exact variant
 * the agent gateway puts in the Google and Meta catalogue feeds
 * (``FEED_IMAGE_URL_TEMPLATE`` in grooveshop-agent-gateway
 * ``internal/config/config.go``), because Google asks for an image to be
 * referenced consistently by one URL. Contained on white, uncropped: Google
 * prefers product photos "against a white background", 1:1 is one of its
 * recommended aspect ratios, and 1000×1000 is well above its 50K-pixel
 * minimum. Change it together with the gateway's template.
 */
export const SEARCH_IMAGE_VARIANT: MediaStreamVariant = {
  width: 1000,
  height: 1000,
  fit: 'contain',
  position: 'center',
  background: 'FFFFFF',
  trimThreshold: 5,
  quality: 85,
  format: 'jpeg',
}

/**
 * The quality every AVIF image is requested at: 100, meaning "the highest
 * the service allows". Media Stream caps AVIF at its own
 * `processing.avifMaxQuality` and clamps BEFORE it hashes the request into
 * a cache entry, so any value at or above the cap names the same entry and
 * the same bytes. The cap is the one place that decides, and it can change
 * without a storefront release; a number written here or at a call site
 * would be either below it (and wrong when it rises) or above it (and
 * ignored). Only AVIF is clamped: WebP, JPEG and PNG keep the quality asked.
 */
export const MEDIA_STREAM_AVIF_QUALITY = 100

/**
 * The single builder for a Media Stream image URL. An AVIF URL always
 * carries {@link MEDIA_STREAM_AVIF_QUALITY}, whatever quality the variant
 * names.
 *
 * ``src`` is the source path Django emits (``media/{schema}/uploads/…`` or
 * ``static/images/…``), joined to ``baseUrl``; an absolute ``src`` keeps
 * its own origin. Each path segment is percent-encoded once (a segment that
 * is already encoded is decoded first), so a Greek filename reaches crawlers
 * and the service as a valid URL. The origin is never touched.
 */
export function buildMediaStreamImageUrl(
  baseUrl: string,
  src: string,
  variant: MediaStreamVariant,
): string {
  const url = joinURL(
    hasProtocol(src) ? '' : baseUrl,
    src,
    String(variant.width),
    String(variant.height),
    variant.fit,
    variant.position,
    variant.background,
    String(variant.trimThreshold),
    `${variant.format === 'avif' ? MEDIA_STREAM_AVIF_QUALITY : variant.quality}.${variant.format}`,
  )
  const origin = url.match(/^[a-z][a-z\d+.-]*:\/\/[^/]+/i)?.[0] ?? ''
  return origin + encodePathSegments(url.slice(origin.length))
}

function encodePathSegments(path: string): string {
  return path
    .split('/')
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment))
      }
      catch {
        return encodeURIComponent(segment)
      }
    })
    .join('/')
}
