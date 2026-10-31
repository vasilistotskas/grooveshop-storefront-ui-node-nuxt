/**
 * HTML Content Utilities
 *
 * Generic, reusable utilities for transforming HTML content.
 * Works on both client (Nuxt App) and server (Nitro) due to shared/ auto-import.
 */

import DOMPurify, { type ElementHook } from 'isomorphic-dompurify'

import { buildMediaStreamImageUrl } from './mediaStream'

import {
  EMBED_IFRAME_ATTRS,
  isAllowedEmbedUrl,
  isYouTubeEmbedUrl,
  parseYouTubeEmbed,
  YOUTUBE_PLAYER_ORIGIN,
  youTubeThumbnailUrl,
  type YouTubeEmbed,
} from './embeds'

/**
 * DOMPurify hooks are registered on the module singleton, so this must
 * happen exactly once per process rather than per sanitise call.
 */
let embedHookInstalled = false

function installEmbedOriginHook(): void {
  if (embedHookInstalled) return
  embedHookInstalled = true

  // ``afterSanitizeAttributes`` is the documented place to enforce a
  // URI allow-list (DOMPurify's own demo does exactly this for href /
  // action). It runs after DOMPurify has already normalised the
  // attribute, so what we read here is what would reach the DOM.
  //
  // Note we do NOT use ``ALLOWED_URI_REGEXP`` for this, even though the
  // docs mention it for iframes: that option applies to EVERY URI
  // attribute in the document, so pinning it to the video hosts would
  // also strip every ordinary <a href> and <img src> out of a blog
  // post.
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName !== 'IFRAME') return
    if (!isAllowedEmbedUrl(node.getAttribute('src'))) {
      node.remove()
    }
  })
}

/**
 * An element of the DOM DOMPurify sanitises in: the browser's, or
 * jsdom's on the server. Named through DOMPurify's own hook type
 * because ``shared/`` is also compiled for the server, where no DOM
 * library is loaded.
 */
type PurifiedElement = Parameters<ElementHook>[0]
type PurifiedNode = PurifiedElement['childNodes'][number]

export interface RichHtmlOptions {
  /**
   * Accessible name of a YouTube facade's play button, in the page's
   * language. Supplied by ``useHtmlContent().sanitize``.
   */
  videoPlayLabel: string
}

/**
 * The CSS length an iframe's ``width`` / ``height`` attribute stands
 * for: a bare number is pixels, a percentage stays one. Anything else
 * is dropped, and the facade falls back to the iframe's default size.
 */
function embedLength(value: string | null): string | null {
  if (!value) return null
  const match = /^(\d+(?:\.\d+)?)(%?)$/.exec(value.trim())
  if (!match) return null
  return `${match[1]}${match[2] || 'px'}`
}

/**
 * The facade a YouTube iframe is replaced with: a button the size of
 * the iframe, showing the video's poster, that loads the player only
 * when pressed (``app/plugins/youtube-facade.client.ts``).
 *
 * The box is carried as ``--embed-w`` / ``--embed-h`` beside the
 * author's own ``style`` and ``class``, and ``.rich-embed``
 * (``app/assets/css/main.css``) sizes the facade and the player from
 * them, so the video lands exactly where its poster was. The poster is
 * a background, not an ``<img>``: every renderer styles the images in a
 * body (radius, margins, ``height: auto``), and none of that may reach
 * the poster.
 */
function buildYouTubeFacade(
  frame: PurifiedElement,
  video: YouTubeEmbed,
  options: RichHtmlOptions,
) {
  const button = frame.ownerDocument.createElement('button')
  button.type = 'button'
  button.className = ['rich-embed', 'youtube-facade', frame.getAttribute('class')]
    .filter(Boolean)
    .join(' ')
  button.dataset.youtubeId = video.id
  if (video.start > 0) button.dataset.youtubeStart = String(video.start)
  const title = frame.getAttribute('title')
  if (title) button.dataset.youtubeTitle = title
  button.setAttribute('aria-label', options.videoPlayLabel)

  const width = embedLength(frame.getAttribute('width'))
  const height = embedLength(frame.getAttribute('height'))
  button.setAttribute('style', [
    width && `--embed-w: ${width}`,
    height && `--embed-h: ${height}`,
    `background-image: url("${youTubeThumbnailUrl(video.id)}")`,
    frame.getAttribute('style'),
  ].filter(Boolean).join('; '))

  const icon = frame.ownerDocument.createElement('span')
  icon.className = 'youtube-facade__play'
  icon.setAttribute('aria-hidden', 'true')
  button.append(icon)

  return button
}

/**
 * Turn every YouTube iframe under ``root`` into a facade. One whose
 * video cannot be read (a playlist) keeps its iframe, moved to the
 * privacy-enhanced host and loaded lazily, since ``frame-src`` allows
 * no other YouTube host.
 */
function replaceYouTubeEmbeds(root: PurifiedElement, options: RichHtmlOptions): void {
  for (const frame of root.querySelectorAll('iframe')) {
    const src = frame.getAttribute('src')
    const video = parseYouTubeEmbed(src)
    if (video) {
      frame.replaceWith(buildYouTubeFacade(frame, video, options))
      continue
    }
    if (src && isYouTubeEmbedUrl(src)) {
      const url = new URL(src)
      frame.setAttribute('src', new URL(`${url.pathname}${url.search}`, YOUTUBE_PLAYER_ORIGIN).href)
      frame.setAttribute('loading', 'lazy')
    }
  }
}

/**
 * Inline declarations a body may not keep: the typeface (``font-family``
 * and the ``font`` shorthand that carries one) and Word's ``mso-*``
 * properties, which no browser reads.
 *
 * Text pasted from Word arrives as ``<span style="font-family: Roboto;
 * mso-ansi-language: EL">``. The store sets its own faces, and a span
 * naming another one downloads that face mid-render and reflows the
 * paragraph around it when it swaps in (CLS 0.115 on webside's post 23).
 * The author's size, colour, alignment and spacing stay.
 */
const FORBIDDEN_STYLE_PROPERTY_RE = /^(?:font|font-family|mso-.*)$/i

/** Word's paragraph and comment classes (``MsoNormal``, ``msocomanchor``). */
const WORD_CLASS_RE = /^mso/i

/**
 * Content a link can draw instead of text: an image, an icon, a player.
 * It names the link only when it carries a name of its own (``linkMedia``).
 */
const LINK_MEDIA_SELECTOR = 'img, svg, video, audio, iframe, canvas'

/**
 * The declarations of an inline ``style``, split on the semicolons that
 * end one: not those inside a string or a ``url(...)``.
 */
function splitDeclarations(style: string): string[] {
  const declarations: string[] = []
  let depth = 0
  let quote = ''
  let start = 0
  for (let i = 0; i < style.length; i++) {
    const char = style[i]
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
    }
    else if (char === '"' || char === '\'') quote = char
    else if (char === '(') depth++
    else if (char === ')') depth = Math.max(0, depth - 1)
    else if (char === ';' && depth === 0) {
      declarations.push(style.slice(start, i))
      start = i + 1
    }
  }
  declarations.push(style.slice(start))
  return declarations.map(declaration => declaration.trim()).filter(Boolean)
}

/**
 * ``style`` without the declarations ``FORBIDDEN_STYLE_PROPERTY_RE``
 * names, or ``undefined`` when it has none: a style with nothing to drop
 * stays exactly as the author wrote it.
 */
function stripForbiddenDeclarations(style: string): string | undefined {
  const declarations = splitDeclarations(style)
  const kept = declarations.filter((declaration) => {
    const property = declaration.slice(0, declaration.indexOf(':')).trim()
    return !FORBIDDEN_STYLE_PROPERTY_RE.test(property)
  })
  return kept.length === declarations.length ? undefined : kept.join('; ')
}

/** ``classes`` without Word's, or ``undefined`` when it has none. */
function stripWordClasses(classes: string): string | undefined {
  const names = classes.split(/\s+/).filter(Boolean)
  const kept = names.filter(name => !WORD_CLASS_RE.test(name))
  return kept.length === names.length ? undefined : kept.join(' ')
}

/**
 * True only while ``sanitizeRichHtml`` runs: the hooks below sit on the
 * DOMPurify singleton, and its other callers (the TOTP QR code's SVG)
 * must come out untouched. ``sanitize`` is synchronous, so the flag
 * cannot leak into another call.
 */
let cleaningRichText = false
let wordCleanupHooksInstalled = false

function installWordCleanupHooks(): void {
  if (wordCleanupHooksInstalled) return
  wordCleanupHooksInstalled = true

  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (!cleaningRichText) return
    const value = data.attrName === 'style'
      ? stripForbiddenDeclarations(data.attrValue)
      : data.attrName === 'class' ? stripWordClasses(data.attrValue) : undefined
    if (value === undefined) return
    data.attrValue = value
    if (!value) data.keepAttr = false
  })
}

const hasText = (value: string | null | undefined): boolean => Boolean(value?.trim())

const isHiddenFromReaders = (element: PurifiedElement): boolean =>
  element.getAttribute('aria-hidden') === 'true' || element.hasAttribute('hidden')

/** The text a reader gets from ``node``: its text, without what is hidden from assistive technology. */
function readableText(node: PurifiedNode): string {
  if (node.nodeType === 3) return node.textContent ?? ''
  if (node.nodeType !== 1 || isHiddenFromReaders(node as PurifiedElement)) return ''
  return [...node.childNodes].map(readableText).join('')
}

/** True when ``media`` supplies a name: a non-empty ``alt`` (images), ``aria-label`` or ``title``. */
function mediaNamesLink(media: PurifiedElement): boolean {
  const role = media.getAttribute('role')
  if (role === 'presentation' || role === 'none' || isHiddenFromReaders(media)) return false
  return (media.tagName === 'IMG' && hasText(media.getAttribute('alt')))
    || hasText(media.getAttribute('aria-label'))
    || hasText(media.getAttribute('title'))
}

/**
 * Whether ``anchor`` has an accessible name, by the sources of W3C ACT
 * rule c487ae in order: ``aria-labelledby`` (only ids that resolve, in
 * this fragment, to an element with text), ``aria-label``, its content (text, or media
 * that names itself: a decorative ``alt=""`` image does not), then ``title``.
 */
function linkHasName(anchor: PurifiedElement, root: PurifiedElement): boolean {
  const labelledBy = anchor.getAttribute('aria-labelledby')?.split(/\s+/).filter(Boolean) ?? []
  if (labelledBy.length) {
    for (const element of root.querySelectorAll('[id]')) {
      if (labelledBy.includes(element.id) && hasText(element.textContent)) return true
    }
  }
  return hasText(anchor.getAttribute('aria-label'))
    || hasText(readableText(anchor))
    || [...anchor.querySelectorAll(LINK_MEDIA_SELECTOR)].some(mediaNamesLink)
    || hasText(anchor.getAttribute('title'))
}

/**
 * Clean the links an editor leaves in a body: one decision per anchor, by
 * its accessible name and its target.
 *
 * - A link (``href``) with a name stays.
 * - Any other anchor is not a link to keep: with no ``href`` it goes
 *   nowhere (a Word comment reference, a half-made link); with an ``href``
 *   but no name (whitespace, ``&nbsp;``, a decorative image, Word's empty
 *   comment marker to ``#_msocom_<n>``) it is a keyboard stop that
 *   announces nothing. It is unwrapped, so its content stays and a
 *   decorative image or the spacing between two words is not lost.
 * - If it is also the target of an in-page link (``id``, or the legacy
 *   ``name``: Word's ``<a id="_Toc1">``), the target stays as a ``span``
 *   with that ``id``, so ``#_Toc1`` still jumps there and no href-less
 *   anchor is left for Lighthouse ``crawlable-anchors``.
 *
 * Run on the sanitised tree, like the embed facades, not inside a hook
 * while DOMPurify is walking it.
 */
function cleanAnchors(root: PurifiedElement): void {
  for (const anchor of root.querySelectorAll('a')) {
    if (anchor.hasAttribute('href') && linkHasName(anchor, root)) continue
    const target = anchor.getAttribute('id') || anchor.getAttribute('name')
    if (target) {
      const place = anchor.ownerDocument.createElement('span')
      place.id = target
      place.append(...anchor.childNodes)
      anchor.replaceWith(place)
    }
    else {
      anchor.replaceWith(...anchor.childNodes)
    }
  }
}

/**
 * Sanitise admin-authored rich text for rendering with ``v-html``.
 *
 * Use this for EVERY WYSIWYG field — blog bodies, product
 * descriptions, CMS rich-text sections — through
 * ``useHtmlContent().sanitize``, which supplies ``options``. A bare
 * ``DOMPurify.sanitize(html)`` silently drops embedded video, because
 * ``iframe`` is not in DOMPurify's default allow-list; that is why
 * videos rendered in the Django admin's TinyMCE editor and vanished on
 * the storefront.
 *
 * Video embeds are permitted, but only from
 * ``EMBED_IFRAME_ORIGINS`` and never with ``srcdoc`` — an iframe from
 * an arbitrary origin, or one carrying its own inline document, is the
 * reason DOMPurify forbids the tag by default. A YouTube video becomes
 * a click-to-load facade: the player weighs 0.5 MB of script per
 * video and sets YouTube and DoubleClick cookies the moment it loads,
 * before the visitor has answered the cookie banner.
 *
 * Text pasted from Word loses what only Word reads or what overrides the
 * store's typeface (``FORBIDDEN_STYLE_PROPERTY_RE``), its ``Mso*``
 * classes and its comment links; every body also loses its empty links
 * and keeps the text of a link with no ``href`` (``cleanAnchors``).
 */
export function sanitizeRichHtml(
  html: string | null | undefined,
  options: RichHtmlOptions,
): string {
  if (!html) return ''

  installEmbedOriginHook()
  installWordCleanupHooks()

  // ``RETURN_DOM`` hands back the sanitised ``<body>``, so the facades
  // are built on the clean tree, after every hook has run, rather than
  // by swapping nodes inside a hook while DOMPurify is walking them.
  // DOMPurify types that ``<body>`` only as a ``Node``.
  cleaningRichText = true
  let body: PurifiedElement
  try {
    body = DOMPurify.sanitize(html, {
      ADD_TAGS: ['iframe'],
      ADD_ATTR: [...EMBED_IFRAME_ATTRS],
      // Belt and braces: ``srcdoc`` is not in the default allow-list and
      // is not added above, but forbidding it explicitly means a future
      // widening of ADD_ATTR cannot quietly let it back in.
      FORBID_ATTR: ['srcdoc'],
      RETURN_DOM: true,
    }) as PurifiedElement
  }
  finally {
    cleaningRichText = false
  }
  cleanAnchors(body)
  replaceYouTubeEmbeds(body, options)
  return body.innerHTML
}

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
   * Widest CSS width, in px, the images are ever shown at. The 1x
   * candidate is requested at this width (or the author's smaller
   * `width`) and the 2x candidate at twice it. Media stream never
   * upscales, so a smaller source simply comes back at its own size.
   */
  maxWidth?: number
  /** Default image format (avif, webp, etc.) */
  format?: string
  /** Default image quality (1-100) for a non-AVIF format: AVIF is always requested at the service's ceiling */
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
 * Widest frame the storefront lays rich text out in: `--container-8xl`
 * (`--ui-container`) in `app/assets/css/main.css`. The default bound for
 * every body that has no narrower column of its own.
 */
export const PAGE_CONTENT_MAX_WIDTH = 1440

/**
 * The blog article column: `minmax(0, 44rem)` in `Storefront/BlogPost.vue`.
 */
export const ARTICLE_COLUMN_MAX_WIDTH = 704

/**
 * The webside blog article column: `max-w-2xl` (42rem) around the
 * body in `variants/webside/Storefront/BlogPost.vue`. Bounding its images
 * by the page frame instead requested every inline image at 1440px on
 * every device, twice the column, and a post with a dozen uncached images
 * exhausted the media service's encoders.
 */
export const WEBSIDE_ARTICLE_COLUMN_MAX_WIDTH = 672

/**
 * Pixel-density candidates emitted per image. 3x is deliberately absent:
 * the media service is CPU-bound and a third candidate buys little.
 */
const IMAGE_DENSITIES = [1, 2] as const

/**
 * Default configuration for image optimization.
 *
 * Media stream reads a `0` width or height as "unconstrained on that axis";
 * both `0` encodes the full-size original. Rich-text images always carry a
 * width, never both `0`. `fit` applies to an image with an authored box;
 * one bounded by width alone is requested with `inside` (see
 * {@link transformImgTag}).
 */
export const defaultHtmlImageConfig: Required<HtmlImageOptimizationConfig> = {
  mediaStreamOrigin: '',
  mediaStreamPath: '/media_stream-image',
  allowedDomains: [],
  maxWidth: PAGE_CONTENT_MAX_WIDTH,
  format: 'avif',
  quality: 80,
  fit: 'contain',
  position: 'entropy',
  background: 'transparent',
  trimThreshold: 0,
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
  /** A `width` written as a share of the column (`"100%"` → 100), clamped to 100 */
  widthPercent?: number
  /**
   * The file's real size in pixels, from `data-natural-width` /
   * `data-natural-height`, which the API records on save for an upload in
   * the store's own media. Both present, or neither.
   */
  naturalWidth?: number
  naturalHeight?: number
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
 * Parse a percentage `width` ("100%", "50%"), as TinyMCE's image dialog
 * writes it. Returns the percentage, at most 100, or undefined.
 */
function parsePercentageValue(value: string | undefined): number | undefined {
  const match = value?.trim().match(/^(\d+(?:\.\d+)?)%$/)
  if (!match?.[1]) return undefined
  const percent = Number.parseFloat(match[1])
  return percent > 0 ? Math.min(percent, 100) : undefined
}

/**
 * Parse attributes from an img tag string
 */
export function parseImgAttributes(imgTag: string): ParsedImageAttributes {
  const attrs: ParsedImageAttributes = { src: '' }

  // Match all attributes: name="value" or name='value' or name=value
  const attrRegex = /([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|(\S+)))?/g
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
      else if (name === 'width') {
        attrs.widthPercent = parsePercentageValue(value)
      }
    }
    else {
      attrs[name] = value
    }
  }

  const naturalWidth = Number.parseInt(String(attrs['data-natural-width']), 10)
  const naturalHeight = Number.parseInt(String(attrs['data-natural-height']), 10)
  if (naturalWidth > 0 && naturalHeight > 0) {
    attrs.naturalWidth = naturalWidth
    attrs.naturalHeight = naturalHeight
  }

  return attrs
}

/**
 * Strip a Cloudflare Image Resizing prefix from a path.
 *
 * CF serves transforms at `/cdn-cgi/image/<options>/<source-path>`, and
 * an editor pasting an image URL copied off a rendered page stores that
 * whole thing as the `src` in TinyMCE. `/cdn-cgi/` is a reserved
 * Cloudflare namespace — it is never a real asset path — so recovering
 * the source path is unambiguous.
 *
 * Without this, the media-stream URL builder kept the prefix and asked
 * the image service for `/media_stream-image/cdn-cgi/image/format=webp/
 * media/...`, which 404s (Ahrefs "Image broken" / "Page has broken
 * image"). Normalising here fixes already-stored content as well as
 * anything pasted later, so no data migration is needed.
 */
export function stripCloudflareImagePrefix(path: string): string {
  const match = path.match(/^\/cdn-cgi\/image\/[^/]+\/(.*)$/)
  return match?.[1] ? `/${match[1]}` : path
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
  // 0 leaves that axis unconstrained (see defaultHtmlImageConfig)
  const width = overrides?.width || 0
  const height = overrides?.height || 0
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

  // A CF Image Resizing prefix would otherwise be handed to the media
  // stream as if it were part of the object key.
  imagePath = stripCloudflareImagePrefix(imagePath)

  // No origin configured: a root-relative URL on the page's own host.
  const baseUrl = `${config.mediaStreamOrigin.replace(/\/$/, '')}${config.mediaStreamPath}`

  return buildMediaStreamImageUrl(baseUrl, imagePath, {
    width,
    height,
    fit,
    position,
    background,
    trimThreshold,
    quality,
    format,
  })
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

  // Request no wider than the column the image is shown in: the author's
  // width when it is smaller, the author's share of the bound for a
  // percentage width, the bound otherwise. Height is only sent together
  // with an authored width, scaled to the same ratio, so the requested box
  // keeps the author's aspect (`config.fit`). Otherwise it stays 0 and the
  // width is only a bound: `inside` returns the source at its own aspect,
  // never enlarged. `contain` means "fill this box", and with one axis it
  // padded a narrower source out to the full bound — webside's 517px
  // description images came back 1440x388 with the photo a third of the
  // width (2026-10-14).
  const columnShare = !attrs.width && attrs.widthPercent ? attrs.widthPercent / 100 : 1
  const width = Math.min(attrs.width || Math.round(config.maxWidth * columnShare), config.maxWidth)
  const heightPerWidth = attrs.width && attrs.height ? attrs.height / attrs.width : 0
  const fit = heightPerWidth ? config.fit : 'inside'
  // The file's own width bounds every candidate: the media service never
  // enlarges, so asking for more only names a duplicate.
  const candidateWidths = [...new Set(IMAGE_DENSITIES.map(density =>
    Math.min(width * density, attrs.naturalWidth ?? Number.POSITIVE_INFINITY),
  ))]
  const candidates = candidateWidths.map((candidateWidth) => {
    return {
      width: candidateWidth,
      url: buildMediaStreamUrl(attrs.src, config, {
        width: candidateWidth,
        height: Math.round(candidateWidth * heightPerWidth),
        fit,
      }),
    }
  })

  // Any srcset/sizes the editor wrote would compete with ours
  let newTag = imgTag.replace(/\s+(?:srcset|sizes)=(?:"[^"]*"|'[^']*'|\S+)/gi, '')

  // The 2x candidate only with an authored width: that attribute fixes the
  // rendered size. Without it, a source narrower than the bound comes back
  // at its own pixels for both candidates (media stream never upscales), and
  // a retina screen picking "2x" would draw it at half its natural size.
  // A lazy image leads its `sizes` with `auto`: the browser then picks the
  // candidate for the width the image is really laid out at, which this
  // string cannot know. A two-column gallery drew a 352px-wide image in a
  // 176px column, so the declared 352px fetched the 704px candidate on
  // every phone (Lighthouse 2026-10-19, F10). `auto` applies to lazy
  // images only, and a browser without it reads the declared list after it.
  const lazy = attrs.loading ? attrs.loading.toLowerCase() === 'lazy' : config.addLazyLoading
  // `auto` also gives the image a 300px fallback intrinsic size (HTML
  // rendering: `contain-intrinsic-size`), which only a width the layout
  // already fixes overrides: an authored width, pixel or percentage. An
  // image with neither keeps its natural size and gets plain `sizes`.
  const layoutWidthKnown = !!(attrs.width || attrs.widthPercent)
  // Known size: the authored pixel width, or the real size the API recorded
  // (which also lets a `width="100%"` image, drawn at the column's width,
  // offer a retina candidate it can really fill). With no authored width the
  // image is drawn at its natural size, up to the column.
  const sizesWidth = layoutWidthKnown ? width : Math.min(width, attrs.naturalWidth ?? width)
  const srcset = attrs.width || attrs.naturalWidth
    ? ` srcset="${candidates.map(({ url, width: w }) => `${url} ${w}w`).join(', ')}" sizes="${lazy && layoutWidthKnown ? 'auto, ' : ''}(max-width: ${sizesWidth}px) 100vw, ${sizesWidth}px"`
    : ''
  newTag = newTag.replace(/src=["'][^"']*["']/i, `src="${candidates[0]?.url}"${srcset}`)

  // A pixel width/height is the author's and stays, and so does a
  // percentage width: "100%" from the editor's image dialog draws the image
  // across that share of the column, as the editor shows it (HTML maps a
  // percentage `width` to the CSS width; `.article img` sets no width of
  // its own). Without the recorded real size, no 2x candidate for it:
  // `sizes` cannot name the column, so a retina screen would fetch twice
  // the page frame. Any other width, and a
  // non-pixel height (`height: auto` keeps the aspect), is dropped.
  if (!attrs.width && !attrs.widthPercent) {
    newTag = newTag.replace(/\s+width=["'][^"']*["']/i, '')
  }
  if (!attrs.height) {
    newTag = newTag.replace(/\s+height=["'][^"']*["']/i, '')
  }

  // A browser reserves an image's space from numeric width and height
  // attributes. Percentages, as TinyMCE writes them, give it no ratio, so a
  // lazy image shifted the page as it arrived: the recorded real size
  // supplies one. Authored pixel attributes already do.
  // An aspect-ratio the author wrote in `style` (a square crop) stays theirs.
  const authoredRatio = /(?:^|[;\s"'])aspect-ratio\s*:/i.test(String(attrs.style ?? ''))
  if (attrs.naturalWidth && attrs.naturalHeight && !(attrs.width && attrs.height) && !authoredRatio) {
    const ratio = `aspect-ratio: ${attrs.naturalWidth} / ${attrs.naturalHeight}`
    newTag = attrs.style !== undefined
      ? newTag.replace(/(\sstyle=)(["'])(.*?)\2/i, (_, name, quote, value) => `${name}${quote}${value.trim().replace(/;?$/, ';')} ${ratio}${quote}`)
      : newTag.replace(/<img/i, `<img style="${ratio}"`)
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
 * Strip all HTML tags from a string, returning plain text.
 * Loops until stable to prevent incomplete sanitization from nested tags
 * (e.g., `<scr<script>ipt>` → `<script>` after one pass).
 */
export function stripHtmlTags(html: string): string {
  if (!html) return ''

  const tagPattern = /<[^>]*>/g
  let result = html
  let prev = ''
  while (result !== prev) {
    prev = result
    result = result.replace(tagPattern, '')
  }
  return result
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: '\'',
  nbsp: ' ',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
}

const ENTITY_RE = /&(#\d{1,7}|#[xX][0-9a-fA-F]{1,6}|[a-zA-Z][a-zA-Z0-9]{1,31});/g

/**
 * Decode the HTML character references an editor's rich text leaves
 * behind, in ONE pass over the string.
 *
 * A pass per entity would be wrong, not just slower: replacing `&lt;`
 * before `&amp;` turns the literal text `&amp;lt;` into `<`. One regex
 * with a lookup table decodes each reference exactly once, and an
 * unknown name is left untouched rather than dropped.
 */
export function decodeHtmlEntities(html: string): string {
  if (!html || !html.includes('&')) return html || ''

  return html.replace(ENTITY_RE, (match, ref: string) => {
    if (ref[0] === '#') {
      const code = ref[1] === 'x' || ref[1] === 'X'
        ? Number.parseInt(ref.slice(2), 16)
        : Number.parseInt(ref.slice(1), 10)
      // Lone surrogates and out-of-range code points would throw.
      if (!Number.isFinite(code) || code <= 0 || code > 0x10FFFF) return match
      if (code >= 0xD800 && code <= 0xDFFF) return match
      return String.fromCodePoint(code)
    }
    return NAMED_ENTITIES[ref] ?? match
  })
}

/** An opening or closing tag of an element that breaks a line, and `<br>` / `<hr>`. */
const BLOCK_BOUNDARY = /<\/?(?:address|article|aside|blockquote|br|dd|details|div|dl|dt|figcaption|figure|footer|h[1-6]|header|hr|li|main|nav|ol|p|pre|section|summary|table|tbody|td|tfoot|th|thead|tr|ul)\b[^>]*>/gi

/**
 * Reduce HTML content to the text a human would read — tags removed,
 * character references decoded, whitespace collapsed.
 *
 * Tags are stripped BEFORE entities are decoded. The other order lets
 * an escaped `&lt;div&gt;` in the copy become a real tag that the
 * stripper then eats, silently deleting text the author wrote.
 *
 * A block element ends a line where the reader sees one, so its tags
 * leave a space: `<p>Γραφείο.</p><ul><li>Δύο θύρες</li></ul>` reads
 * "Γραφείο. Δύο θύρες", where a bare strip glued it into
 * "Γραφείο.Δύο θύρες". An inline tag (`<b>`, `<a>`, `<span>`) sits inside
 * a word as often as between two, so it leaves nothing.
 */
export function htmlToPlainText(html: string): string {
  if (!html) return ''

  return decodeHtmlEntities(stripHtmlTags(html.replace(BLOCK_BOUNDARY, ' '))).replace(/\s+/g, ' ').trim()
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
