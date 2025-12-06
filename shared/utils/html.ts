/**
 * HTML Content Utilities
 *
 * Generic, reusable utilities for transforming HTML content.
 * Works on both client (Nuxt App) and server (Nitro) due to shared/ auto-import.
 */

/**
 * Configuration for image optimization in HTML content
 */
export interface HtmlImageOptimizationConfig {
  /** Full origin URL for media stream service (e.g., 'http://localhost:3003') */
  mediaStreamOrigin: string
  /** Path prefix for media stream (e.g., '/media_stream-image') */
  mediaStreamPath: string
  /** Allowed source domains that should be transformed */
  allowedDomains: string[]
  /**
   * Default width when not specified or invalid (e.g., percentage).
   * Use 0 to preserve original image dimensions (no resizing).
   */
  defaultWidth?: number
  /**
   * Default height when not specified or invalid (e.g., percentage).
   * Use 0 to preserve original image dimensions (no resizing).
   */
  defaultHeight?: number
  /** Default image format (avif, webp, etc.) */
  format?: string
  /** Default image quality (1-100) */
  quality?: number
  /** Default fit mode */
  fit?: 'contain' | 'cover' | 'fill' | 'inside' | 'outside'
  /** Default position for cropping */
  position?: string
  /** Default background color */
  background?: string
  /** Trim threshold */
  trimThreshold?: number
  /** Add loading="lazy" to images without loading attribute */
  addLazyLoading?: boolean
  /** Add decoding="async" to images */
  addAsyncDecoding?: boolean
}

/**
 * Default configuration for image optimization
 * Note: defaultWidth/defaultHeight of 0 means "use original image dimensions"
 * The media stream service will skip resizing when dimensions are 0.
 */
export const defaultHtmlImageConfig: Required<HtmlImageOptimizationConfig> = {
  mediaStreamOrigin: '',
  mediaStreamPath: '/media_stream-image',
  allowedDomains: [],
  defaultWidth: 0,
  defaultHeight: 0,
  format: 'avif',
  quality: 80,
  fit: 'contain',
  position: 'entropy',
  background: 'transparent',
  trimThreshold: 5,
  addLazyLoading: true,
  addAsyncDecoding: true,
}

/**
 * Parsed image attributes from an HTML img tag
 */
export interface ParsedImageAttributes {
  src: string
  width?: number
  height?: number
  alt?: string
  loading?: string
  decoding?: string
  [key: string]: string | number | undefined
}

/**
 * Parse a dimension value (width/height) from an img tag
 * Returns undefined for percentage values, auto, or invalid values
 */
function parseDimensionValue(value: string | undefined): number | undefined {
  if (!value) return undefined

  const trimmedValue = value.trim()

  // Skip percentage values (e.g., "100%", "50%")
  if (trimmedValue.includes('%')) return undefined

  // Skip 'auto' or other non-numeric values
  if (trimmedValue === 'auto' || trimmedValue === 'inherit') return undefined

  // Skip values with units other than px (em, rem, vw, vh, etc.)
  if (/[a-z]/i.test(trimmedValue.replace('px', ''))) return undefined

  // Parse numeric value (handles "800", "800px", etc.)
  const numValue = Number.parseInt(trimmedValue, 10)

  // Only return if it's a valid positive number and reasonably sized
  // Skip very small values that are likely not actual pixel dimensions
  if (!Number.isNaN(numValue) && numValue > 50) {
    return numValue
  }

  return undefined
}

/**
 * Parse attributes from an img tag string
 */
export function parseImgAttributes(imgTag: string): ParsedImageAttributes {
  const attrs: ParsedImageAttributes = { src: '' }

  // Match all attributes: name="value" or name='value' or name=value
  const attrRegex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
  let match

  while ((match = attrRegex.exec(imgTag)) !== null) {
    const [, name, doubleQuoted, singleQuoted, unquoted] = match
    if (!name) continue

    const value = doubleQuoted ?? singleQuoted ?? unquoted ?? ''

    if (name === 'width' || name === 'height') {
      const numValue = parseDimensionValue(value)
      if (numValue !== undefined) {
        attrs[name] = numValue
      }
    }
    else {
      attrs[name] = value
    }
  }

  return attrs
}

/**
 * Extract the path portion from a URL, stripping any origin
 */
export function extractPathFromUrl(url: string): string {
  // If it's already a relative path (starts with / but not //), return as-is
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url
  }

  // If it starts with 'media/' (relative without leading slash), add the slash
  if (url.startsWith('media/')) {
    return `/${url}`
  }

  // Handle full URLs with protocol (http:// or https://)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // Find the first slash after the protocol and host
    const protocolEnd = url.indexOf('://') + 3
    const pathStart = url.indexOf('/', protocolEnd)
    if (pathStart !== -1) {
      return url.slice(pathStart)
    }
    // URL has no path, return root
    return '/'
  }

  // Handle protocol-relative URLs (//host/path)
  if (url.startsWith('//')) {
    const pathStart = url.indexOf('/', 2)
    if (pathStart !== -1) {
      return url.slice(pathStart)
    }
    return '/'
  }

  // Try to parse as URL to extract pathname (fallback for other protocols)
  try {
    const parsed = new URL(url)
    return parsed.pathname
  }
  catch {
    // If all parsing fails, return as-is with leading slash
    return url.startsWith('/') ? url : `/${url}`
  }
}

/**
 * Build a media stream optimized URL
 */
export function buildMediaStreamUrl(
  src: string,
  config: Required<HtmlImageOptimizationConfig>,
  overrides?: Partial<{
    width: number
    height: number
    format: string
    quality: number
    fit: string
    position: string
    background: string
    trimThreshold: number
  }>,
): string {
  // Use provided dimensions or fall back to config defaults
  const width = overrides?.width || config.defaultWidth
  const height = overrides?.height || config.defaultHeight
  const format = overrides?.format || config.format
  const quality = overrides?.quality || config.quality
  const fit = overrides?.fit || config.fit
  const position = overrides?.position || config.position
  const background = overrides?.background || config.background
  const trimThreshold = overrides?.trimThreshold || config.trimThreshold

  // Extract just the path from the source URL (strips any origin)
  let imagePath = extractPathFromUrl(src)

  // Safety check: ensure imagePath doesn't contain a protocol (shouldn't happen, but just in case)
  if (imagePath.includes('://')) {
    const match = imagePath.match(/https?:\/\/[^/]+(\/.*)/)
    if (match?.[1]) {
      imagePath = match[1]
    }
  }

  // Ensure path starts with /
  if (!imagePath.startsWith('/')) {
    imagePath = `/${imagePath}`
  }

  // Build the path portion (without origin)
  const pathSegments = [
    config.mediaStreamPath,
    imagePath,
    width.toString(),
    height.toString(),
    fit,
    position,
    background,
    trimThreshold.toString(),
    `${quality}.${format}`,
  ]

  // Join path segments and clean up multiple consecutive slashes
  const path = pathSegments.join('/').replace(/\/{2,}/g, '/')

  // Encode path segments that contain unicode characters
  const encodedPath = encodeMediaStreamPath(path)

  // Prepend origin if provided
  if (config.mediaStreamOrigin) {
    return `${config.mediaStreamOrigin.replace(/\/$/, '')}${encodedPath}`
  }

  return encodedPath
}

/**
 * Encode a single path segment to handle Unicode characters safely
 * Only encodes characters that are not valid in URL paths
 */
export function encodePathSegment(segment: string): string {
  if (!segment) return segment

  // Only encode if the segment contains non-ASCII characters
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(segment)) {
    return segment
  }

  try {
    // Decode first to avoid double-encoding, then encode
    return encodeURIComponent(decodeURIComponent(segment))
  }
  catch {
    // If decoding fails, just encode
    return encodeURIComponent(segment)
  }
}

/**
 * Encode path to handle Unicode characters in filenames safely
 * Only encodes segments that contain non-ASCII characters
 */
export function encodeMediaStreamPath(path: string): string {
  return path
    .split('/')
    .map(segment => encodePathSegment(segment))
    .join('/')
}

/**
 * Check if an image source should be transformed
 */
export function shouldTransformImage(
  src: string,
  config: Required<HtmlImageOptimizationConfig>,
): boolean {
  // Skip if already using media stream path (already optimized)
  if (src.includes('media_stream')) return false

  // Skip data URLs
  if (src.startsWith('data:')) return false

  // Skip SVGs (they don't benefit from raster optimization)
  if (src.endsWith('.svg')) return false

  // Skip if the URL is from the media stream origin (already served by media stream)
  if (config.mediaStreamOrigin && src.startsWith(config.mediaStreamOrigin)) {
    // But only skip if it's already an optimized URL (contains media_stream path)
    // If it's just a raw file on the media stream origin, we should transform it
    if (!src.includes(config.mediaStreamPath)) {
      return true // Transform raw files on media stream origin
    }
    return false
  }

  // Check if it's from an allowed domain
  if (config.allowedDomains.length > 0) {
    return config.allowedDomains.some((domain) => {
      return src.startsWith(domain)
        || src.startsWith(`//${domain.replace(/^https?:\/\//, '')}`)
    })
  }

  // If no domains specified, transform relative URLs or media paths
  return src.startsWith('/') || src.startsWith('media/')
}

/**
 * Transform a single img tag to use optimized URL
 */
export function transformImgTag(
  imgTag: string,
  config: Required<HtmlImageOptimizationConfig>,
): string {
  const attrs = parseImgAttributes(imgTag)

  if (!attrs.src || !shouldTransformImage(attrs.src, config)) {
    return imgTag
  }

  // Determine actual dimensions to use (parsed value or default)
  // 0 means "use original image dimensions" (media stream will skip resizing)
  const actualWidth = attrs.width || config.defaultWidth
  const actualHeight = attrs.height || config.defaultHeight

  // Build optimized URL with actual dimensions
  const optimizedSrc = buildMediaStreamUrl(attrs.src, config, {
    width: actualWidth,
    height: actualHeight,
  })

  // Start building the new img tag
  let newTag = imgTag

  // Replace src
  newTag = newTag.replace(
    /src=["'][^"']*["']/i,
    `src="${optimizedSrc}"`,
  )

  // Handle width/height attributes based on whether we have valid dimensions
  if (attrs.width) {
    // Width was valid pixel value, keep it
  }
  else if (actualWidth > 0) {
    // We have a non-zero default width, update the attribute
    if (/width=["'][^"']*["']/i.test(newTag)) {
      newTag = newTag.replace(/width=["'][^"']*["']/i, `width="${actualWidth}"`)
    }
    else {
      newTag = newTag.replace(/<img/i, `<img width="${actualWidth}"`)
    }
  }
  else {
    // Width is 0 (use original) - remove invalid width attribute (like "100%")
    // Let the browser use the image's natural dimensions
    newTag = newTag.replace(/\s*width=["'][^"']*["']/i, '')
  }

  if (attrs.height) {
    // Height was valid pixel value, keep it
  }
  else if (actualHeight > 0) {
    // We have a non-zero default height, update the attribute
    if (/height=["'][^"']*["']/i.test(newTag)) {
      newTag = newTag.replace(/height=["'][^"']*["']/i, `height="${actualHeight}"`)
    }
    else {
      newTag = newTag.replace(/<img/i, `<img height="${actualHeight}"`)
    }
  }
  else {
    // Height is 0 (use original) - remove invalid height attribute (like "100%")
    // Let the browser use the image's natural dimensions
    newTag = newTag.replace(/\s*height=["'][^"']*["']/i, '')
  }

  // Add loading="lazy" if not present and enabled
  if (config.addLazyLoading && !attrs.loading) {
    newTag = newTag.replace(/<img/i, '<img loading="lazy"')
  }

  // Add decoding="async" if not present and enabled
  if (config.addAsyncDecoding && !attrs.decoding) {
    newTag = newTag.replace(/<img/i, '<img decoding="async"')
  }

  return newTag
}

/**
 * Transform all images in HTML content to use optimized URLs
 *
 * @param html - Raw HTML content (e.g., from CMS/TinyMCE)
 * @param config - Optimization configuration
 * @returns HTML with transformed image URLs
 *
 * @example
 * ```ts
 * const optimizedHtml = transformHtmlImages(blogPostBody, {
 *   mediaStreamPath: '/media_stream-image',
 *   allowedDomains: ['https://static.example.com'],
 * })
 * ```
 */
export function transformHtmlImages(
  html: string,
  config: Partial<HtmlImageOptimizationConfig> = {},
): string {
  if (!html) return ''

  const mergedConfig: Required<HtmlImageOptimizationConfig> = {
    ...defaultHtmlImageConfig,
    ...config,
  }

  // Match all img tags
  const imgRegex = /<img[^>]*>/gi

  return html.replace(imgRegex, (imgTag) => {
    return transformImgTag(imgTag, mergedConfig)
  })
}

/**
 * Extract all image sources from HTML content
 * Useful for preloading or prefetching
 */
export function extractImageSources(html: string): string[] {
  if (!html) return []

  const sources: string[] = []
  const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*>/gi
  let match

  while ((match = imgRegex.exec(html)) !== null) {
    if (match[1]) {
      sources.push(match[1])
    }
  }

  return sources
}
