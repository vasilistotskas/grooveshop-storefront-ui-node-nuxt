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
  // Users sometimes type the country code without "+" next to the sticky
  // "+30" badge (e.g. "306943413781"). No Greek national number starts
  // with 3, so "30" followed by 10 digits is unambiguously a
  // country-code-included number — re-prefix instead of producing the
  // invalid "+3030…".
  if (/^30\d{10}$/.test(digits)) {
    return `+${digits}`
  }
  return GREEK_PREFIX + digits
}

/**
 * Loose plausibility check for a phone number, applied to the
 * ``normalizeGreekPhone`` output — the same value that gets submitted.
 *
 * Deliberately *looser* than Django's `phonenumber_field` so a real
 * customer can never be falsely rejected at checkout:
 * - Greek numbers (`+30…`) are checked against libphonenumber's own
 *   umbrella pattern for Greece (``general_desc.national_number_pattern``,
 *   verified against `phonenumbers` 9.0.36 — the exact library Django
 *   validates with). It admits every assigned range — geographic (2x),
 *   mobile (69x/68x/94x), personal (70x), toll-free/shared-cost (800/801/…,
 *   the only ranges allowed 11–12 digits), premium (90x), corporate UAN
 *   (5005000xxx) — while rejecting wrong lengths and unassigned leading
 *   digits (1, 3, 4), which covers the real typo classes (e.g. the
 *   "+3030…" double country code).
 * - Foreign numbers (any other `+…`) only get an E.164 length check.
 *
 * Django re-validates authoritatively (`PHONENUMBER_DEFAULT_REGION =
 * "GR"`); anything that slips through here surfaces as a field-level
 * DRF error in the checkout toast.
 */
const GREEK_E164 = /^\+30(?:5005000\d{3}|8\d{9,11}|(?:[269]\d|70)\d{8})$/
const FOREIGN_E164 = /^\+[1-9]\d{7,14}$/

export function isPlausiblePhone(raw: string | null | undefined): boolean {
  const normalized = normalizeGreekPhone(raw)
  if (!normalized) return false
  if (normalized.startsWith(GREEK_PREFIX)) {
    return GREEK_E164.test(normalized)
  }
  return FOREIGN_E164.test(normalized)
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
