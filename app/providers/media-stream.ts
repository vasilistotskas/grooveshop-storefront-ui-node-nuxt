import type { ProviderGetImage } from '@nuxt/image'
import { joinURL } from 'ufo'

/**
 * Custom Nuxt Image provider for the Media Stream service
 *
 * Generates optimised image URLs with the following structure:
 * /{tenantSchema}/uploads/{imageType}/{image}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}
 *
 * The tenant schema segment is injected so the media service can route
 * per-tenant storage buckets. `src` values coming from Django already
 * contain the path relative to the tenant's uploads root (e.g.
 * `blog/image.jpg`), so the provider prepends `/{schemaName}/uploads/`.
 *
 * Example:
 *   src = 'blog/image.jpg', schema = 'webside'
 *   → /webside/uploads/blog/image.jpg/440/247/cover/attention/transparent/5/80.webp
 *
 * @see https://image.nuxt.com/advanced/custom-provider
 */
export const getImage: ProviderGetImage = (src, { modifiers = {}, baseURL } = {}) => {
  if (!baseURL) {
    throw new Error('Media Stream base URL is not configured. Set NUXT_PUBLIC_MEDIA_STREAM_PATH in your environment.')
  }

  // Resolve the current tenant schema. The `useTenant` useState key is
  // populated by the `tenant` plugin (enforce: 'pre') during SSR and
  // serialised into the Nuxt payload for hydration — it is safe to read
  // here because image providers are called during the render phase, after
  // all 'pre' plugins have run.
  //
  // Fallback order:
  //   1. useState('tenant') — set by the 'pre' plugin, works on both SSR + client.
  //   2. useTenantStore().config — Pinia store, hydrated in 'app:created' hook.
  //   3. Empty string — graceful degradation; URLs will be malformed but won't
  //      crash the render. A console warning is emitted to surface the issue.
  let schemaName = ''
  try {
    const nuxtApp = useNuxtApp()
    // Try useState first (available pre-Pinia)
    const tenantState = nuxtApp.payload.state?.['$stenant'] ?? nuxtApp.ssrContext?.event?.context?.tenant
    if (tenantState && typeof tenantState === 'object' && 'schemaName' in tenantState) {
      schemaName = (tenantState as TenantConfig).schemaName
    }
    else {
      // Fall back to reading via useState helper
      const tenantRef = useState<TenantConfig | null>('tenant')
      schemaName = tenantRef.value?.schemaName ?? ''
    }
  }
  catch {
    // Graceful degradation — do not crash SSR if Nuxt context is unavailable
    // (e.g., during prerendering probes or provider unit tests).
  }

  if (!schemaName) {
    log.warn('image', 'media-stream provider: schemaName unavailable, URLs may be malformed')
  }

  const mediaStreamBaseURL = baseURL

  // Default modifiers
  const width = modifiers.width || 100
  const height = modifiers.height || 100
  const fit = modifiers.fit || 'contain'
  const position = normalizePosition(modifiers.position)
  const background = normalizeBackground(modifiers.background)
  const trimThreshold = modifiers.trimThreshold || 5
  const quality = modifiers.quality || 80
  const format = modifiers.format || 'avif'

  // Pattern: /{schemaName}/uploads/{src}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}
  const pathSegments = schemaName
    ? [schemaName, 'uploads', src, width.toString(), height.toString(), fit, position, background, trimThreshold.toString(), `${quality}.${format}`]
    : [src, width.toString(), height.toString(), fit, position, background, trimThreshold.toString(), `${quality}.${format}`]

  const url = joinURL(mediaStreamBaseURL, ...pathSegments)

  const encodedUrl = encodeImageUrl(url)

  return {
    url: encodedUrl,
  }
}

/**
 * Encode image URL to handle Unicode characters for social media crawlers
 *
 * @param url - The image URL to encode
 * @returns Properly encoded URL safe for social media meta tags
 *
 * @example
 * encodeImageUrl('https://cdn.com/media/πωσ.png/1200/630/80.webp')
 * // Returns: 'https://cdn.com/media/%CF%80%CF%89%CF%83.png/1200/630/80.webp'
 */
function encodeImageUrl(url: string): string {
  try {
    const urlObj = new URL(url)

    urlObj.pathname = urlObj.pathname
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

    return urlObj.toString()
  }
  catch {
    log.warn('image', 'Failed to encode image URL')
    return url
  }
}

/**
 * Normalize position values to match backend expectations
 */
function normalizePosition(position: string | undefined): string {
  const positionMap: Record<string, string> = {
    centre: 'center',
    center: 'center',
    left: 'left',
    right: 'right',
    top: 'top',
    bottom: 'bottom',
    west: 'west',
    east: 'east',
    north: 'north',
    south: 'south',
    northwest: 'northwest',
    northeast: 'northeast',
    southwest: 'southwest',
    southeast: 'southeast',
    entropy: 'entropy',
    attention: 'attention',
  }

  return positionMap[position || 'entropy'] || 'entropy'
}

/**
 * Normalize background values to hex colors
 */
function normalizeBackground(background: string | undefined): string {
  if (!background) return 'transparent'

  const colorMap: Record<string, string> = {
    black: '000000',
    white: 'FFFFFF',
    transparent: 'transparent',
  }

  return colorMap[background.toLowerCase()] || background
}
