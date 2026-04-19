/**
 * Phone number utilities — Greek market.
 *
 * The storefront's phone UInput displays a sticky "+30" leading badge
 * and users enter their local Greek number.
 *
 * Django side: `PHONENUMBER_DEFAULT_REGION = "GR"` in settings.py, so
 * `phonenumber_field` would parse bare Greek numbers correctly on its
 * own. We still normalize client-side for three reasons:
 *   1. immediate feedback — we know exactly what's going to be stored
 *      before the request flies, so Zod validation and error messages
 *      stay consistent.
 *   2. defensive — foreign-prefix numbers (+44, +49, …) keep their
 *      country code instead of being mistaken for Greek locals.
 *   3. round-tripping — `stripGreekPrefixForDisplay` lets us show the
 *      local portion in inputs that are pre-populated from stored
 *      E.164 values without the "+30 +30…" double-prefix glitch.
 */

const GREEK_PREFIX = '+30'

/**
 * Normalize a Greek phone-number string to E.164 (`+30...`).
 *
 * - Strips whitespace, dashes, parens
 * - If the caller already typed `+30...` or `0030...`, pass through
 *   (re-prefixed as `+30`)
 * - Otherwise, prepends `+30` to the cleaned digits
 *
 * Returns an empty string when the input is empty/falsy so the
 * downstream validator sees "missing" rather than a bare "+30".
 */
export function normalizeGreekPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const cleaned = String(raw).replace(/[\s\-()]/g, '').trim()
  if (!cleaned) return ''

  if (cleaned.startsWith(GREEK_PREFIX)) {
    return cleaned
  }
  if (cleaned.startsWith('0030')) {
    return GREEK_PREFIX + cleaned.slice(4)
  }
  if (cleaned.startsWith('+')) {
    // Foreign international number — respect the user's prefix.
    return cleaned
  }
  // Bare digits (possibly with leading 0): strip a single leading 0 if
  // present (Greek landlines sometimes written as 0211... domestically).
  const digits = cleaned.replace(/^0/, '')
  return GREEK_PREFIX + digits
}

/**
 * Strip a Greek E.164 prefix so a pre-populated input can show the
 * local portion next to the visible "+30" badge.
 *
 * - `+306912345678` → `6912345678`
 * - `+44 7911 123456` → `+44 7911 123456` (non-GR, returned as-is)
 * - empty / undefined → empty
 */
export function stripGreekPrefixForDisplay(
  raw: string | null | undefined,
): string {
  if (!raw) return ''
  const s = String(raw).trim()
  if (s.startsWith(GREEK_PREFIX)) {
    return s.slice(GREEK_PREFIX.length).trim()
  }
  if (s.startsWith('0030')) {
    return s.slice(4).trim()
  }
  return s
}
