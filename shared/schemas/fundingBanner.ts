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
 */

export interface FundingBanner {
  enabled: boolean
  image?: string
  alt?: string
  link?: string
  label?: string
}

const URL_RE = /^(\/(?!\/)|https:\/\/)/
const URL_MAX = 1000
const TEXT_MAX = 300
const ALLOWED_KEYS = new Set(['enabled', 'image', 'alt', 'link', 'label'])

function isBoundedString(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max
}

function isUrl(value: unknown): value is string {
  return isBoundedString(value, URL_MAX) && URL_RE.test(value)
}

export function isFundingBanner(value: unknown): value is FundingBanner {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  if (Object.keys(data).some(key => !ALLOWED_KEYS.has(key))) return false

  if (typeof data.enabled !== 'boolean') return false
  if (data.image !== undefined && !isUrl(data.image)) return false
  if (data.link !== undefined && !isUrl(data.link)) return false
  if (data.alt !== undefined && !isBoundedString(data.alt, TEXT_MAX)) return false
  if (data.label !== undefined && !isBoundedString(data.label, TEXT_MAX)) return false

  // An enabled strip is a public compliance mark: an image without its
  // description fails the accessibility check it exists to pass.
  if (data.enabled && !(data.alt ?? '').trim()) return false

  return true
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
