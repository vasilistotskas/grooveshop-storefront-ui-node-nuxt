/**
 * Render-time contract for the ``FUNDING_BANNER`` extra_setting: the
 * public co-funding strip (EU / ΕΣΠΑ) above the header.
 *
 * Write-side mirror: ``tenant/validators.py`` in the Django repo — keep
 * the two in sync.
 *
 * Deliberately ZOD-FREE, like ``shared/schemas/announcementBar.ts``: the
 * strip sits above the header, so every page reads this setting and a
 * zod import would join every page's critical JS graph.
 *
 * ``image`` is the official artwork and ``alt`` its description, which a
 * strip with an image must have; ``link`` is where the strip goes (the
 * short description of the operation) and ``label`` an optional visible
 * line beside the artwork, inside the same link. ``image`` and ``link``
 * are a ``/``-relative path or an https URL — a protocol-relative
 * ``//host`` is neither and is refused.
 *
 * ``width`` and ``height`` are the artwork's intrinsic size in pixels,
 * required with an ``image`` and refused without one. The strip sits
 * above everything, so an image with no reserved box pushed the whole
 * page down as it loaded (CLS 0.12 on a desktop home page); with them
 * the box is drawn at its final size before the artwork arrives.
 *
 * ``i18n`` is a PARTIAL per-locale override, the same convention as
 * ``ANNOUNCEMENT_BAR`` and ``PageSection.i18n``: a locale may replace the
 * artwork (the programme publishes the strip per language), always with
 * its own size and alt, and the words. ``link`` and ``enabled`` are one value for
 * every language; the strip puts the locale prefix on the path. Readers
 * go through ``localizedFundingBanner``, never the raw overlay.
 */

interface FundingBannerText {
  alt?: string
  label?: string
}

interface FundingBannerBase extends FundingBannerText {
  enabled: boolean
  link?: string
}

/** The official artwork, with the intrinsic size its box is drawn at. */
interface WithArtwork {
  image: string
  width: number
  height: number
}

interface WithoutArtwork {
  image?: undefined
  width?: undefined
  height?: undefined
}

/** What one locale replaces: its artwork, with its own size, and its words. */
export type FundingBannerOverride = FundingBannerText & (WithArtwork | WithoutArtwork)

/** The banner one locale renders: the overlay is already applied. */
export type LocalizedFundingBanner = FundingBannerBase & (WithArtwork | WithoutArtwork)

export type FundingBanner = LocalizedFundingBanner & {
  i18n?: Record<string, FundingBannerOverride>
}

const URL_RE = /^(\/(?!\/)|https:\/\/)/
const URL_MAX = 1000
const TEXT_MAX = 300
const PIXELS_MAX = 10000
const ALLOWED_KEYS = new Set(['enabled', 'image', 'alt', 'link', 'label', 'width', 'height', 'i18n'])
const OVERRIDE_KEYS = new Set(['image', 'alt', 'label', 'width', 'height'])

function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}

function isUrl(value: unknown): value is string {
  return isBoundedString(value, URL_MAX) && URL_RE.test(value)
}

function isPixels(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) > 0 && (value as number) <= PIXELS_MAX
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** ``image`` with its intrinsic size, or none of the three. */
function hasValidArtwork(data: Record<string, unknown>): boolean {
  if (data.image === undefined) return data.width === undefined && data.height === undefined
  return isUrl(data.image) && isPixels(data.width) && isPixels(data.height)
}

function hasValidText(data: Record<string, unknown>): boolean {
  return (data.alt === undefined || isBoundedString(data.alt, TEXT_MAX))
    && (data.label === undefined || isBoundedString(data.label, TEXT_MAX))
}

function isOverride(value: unknown): value is FundingBannerOverride {
  if (!isRecord(value)) return false
  const keys = Object.keys(value)
  if (!keys.length || keys.some(key => !OVERRIDE_KEYS.has(key))) return false
  // A locale may change the logos' accessible name, never blank it, and
  // its own artwork brings its own: the default alt describes another
  // picture, in another language.
  if (value.alt !== undefined && !String(value.alt).trim()) return false
  if (value.image !== undefined && value.alt === undefined) return false
  return hasValidArtwork(value) && hasValidText(value)
}

export function isFundingBanner(value: unknown): value is FundingBanner {
  if (!isRecord(value)) return false
  const data = value
  if (Object.keys(data).some(key => !ALLOWED_KEYS.has(key))) return false

  if (typeof data.enabled !== 'boolean') return false
  if (data.link !== undefined && !isUrl(data.link)) return false
  if (!hasValidArtwork(data) || !hasValidText(data)) return false
  if (data.i18n !== undefined
    && !(isRecord(data.i18n) && Object.values(data.i18n).every(isOverride))) {
    return false
  }

  // An enabled strip is a public compliance mark: an image without its
  // description fails the accessibility check it exists to pass.
  if (data.enabled && !(typeof data.alt === 'string' && data.alt.trim())) return false

  return true
}

/**
 * The banner as ``locale`` renders it: that locale's override laid over
 * the default, artwork and size together, and the overlay itself gone.
 */
export function localizedFundingBanner(
  banner: FundingBanner,
  locale: string,
): LocalizedFundingBanner {
  const { i18n, ...base } = banner
  const override = i18n?.[locale]
  if (!override) return base
  const text: FundingBannerText = {
    ...(override.alt !== undefined && { alt: override.alt }),
    ...(override.label !== undefined && { label: override.label }),
  }
  return override.image === undefined
    ? { ...base, ...text }
    : { ...base, ...text, image: override.image, width: override.width, height: override.height }
}

/**
 * Parse the raw setting string. ``null`` for anything unusable — an
 * empty value, malformed JSON, or a shape the guard rejects — so every
 * consumer renders nothing rather than a half-built strip.
 */
export function parseFundingBannerValue(raw: string): FundingBanner | null {
  if (!raw) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  }
  catch {
    return null
  }
  return isFundingBanner(parsed) ? parsed : null
}
