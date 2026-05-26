import type { ImageModifiers } from '@nuxt/image'
import { defineProvider } from '@nuxt/image/runtime'
import { joinURL } from 'ufo'

/**
 * Media Stream service modifiers — the standard {@link ImageModifiers} plus the
 * two service-specific knobs encoded in the URL path (`position`, `trimThreshold`).
 */
export interface MediaStreamModifiers extends ImageModifiers {
  position: string
  trimThreshold: number | string
}

/**
 * Provider options supplied via `image.providers.mediaStream.options` in
 * `nuxt.config.ts`. `baseURL` points at the Media Stream service origin/path.
 */
export interface MediaStreamOptions {
  baseURL: string
  modifiers: Partial<MediaStreamModifiers>
}

/**
 * Custom Nuxt Image provider for the Media Stream service.
 *
 * Generates optimized image URLs with the following structure:
 * /media/uploads/{imageType}/{image}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}
 *
 * Example: /media/uploads/blog/image.jpg/440/247/cover/attention/transparent/5/80.webp
 *
 * @see https://image.nuxt.com/advanced/custom-provider
 */
export default defineProvider<Partial<MediaStreamOptions>>({
  getImage(src, { modifiers, baseURL }) {
    if (!baseURL) {
      throw new Error('Media Stream base URL is not configured. Set NUXT_PUBLIC_MEDIA_STREAM_PATH in your environment.')
    }

    // Defaults applied when a modifier is not supplied per-image.
    const width = modifiers.width || 100
    const height = modifiers.height || 100
    const fit = modifiers.fit || 'contain'
    const position = normalizePosition(modifiers.position)
    const background = normalizeBackground(modifiers.background)
    const trimThreshold = modifiers.trimThreshold ?? 5
    const quality = modifiers.quality || 80
    const format = modifiers.format || 'avif'

    // Pattern: /{src}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}
    const url = joinURL(
      baseURL,
      src,
      width.toString(),
      height.toString(),
      fit,
      position,
      background,
      trimThreshold.toString(),
      `${quality}.${format}`,
    )

    return {
      url: encodeImageUrl(url),
    }
  },
})

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
