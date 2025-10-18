import type { ProviderGetImage } from '@nuxt/image'
import { joinURL } from 'ufo'

/**
 * Custom Nuxt Image provider for GrooveShop Media Stream service
 *
 * Generates optimized image URLs with the following structure:
 * /media/uploads/{imageType}/{image}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}
 *
 * Example: /media/uploads/blog/image.jpg/440/247/cover/attention/transparent/5/80.webp
 *
 * @see https://image.nuxt.com/advanced/custom-provider
 */
export const getImage: ProviderGetImage = (src, { modifiers = {}, baseURL } = {}) => {
  const config = useRuntimeConfig()

  // Use provided baseURL or fall back to runtime config
  const mediaStreamBaseURL = baseURL || config.public.mediaStreamPath as string

  if (!mediaStreamBaseURL) {
    throw new Error('Media Stream base URL is not configured')
  }

  // Default modifiers with sensible defaults
  const width = modifiers.width || 100
  const height = modifiers.height || 100
  const fit = modifiers.fit || 'contain'
  const position = normalizePosition(modifiers.position)
  const background = normalizeBackground(modifiers.background)
  const trimThreshold = modifiers.trimThreshold || 5
  const quality = modifiers.quality || 80
  const format = modifiers.format || 'webp'

  // Build URL path segments
  // Pattern: /{src}/{width}/{height}/{fit}/{position}/{background}/{trimThreshold}/{quality}.{format}
  const pathSegments = [
    src,
    width.toString(),
    height.toString(),
    fit,
    position,
    background,
    trimThreshold.toString(),
    `${quality}.${format}`, // Format with extension: "80.webp"
  ]

  const url = joinURL(mediaStreamBaseURL, ...pathSegments)

  return {
    url,
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

  // Convert common color names to hex
  const colorMap: Record<string, string> = {
    black: '000000',
    white: 'FFFFFF',
    transparent: 'transparent',
  }

  return colorMap[background.toLowerCase()] || background
}
