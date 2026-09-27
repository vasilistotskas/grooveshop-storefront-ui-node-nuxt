/**
 * Country-aware phone-number utilities.
 *
 * Delivery is no longer Greece-only (BoxNow now serves Cyprus lockers
 * too), so a phone number cannot be validated against one hardcoded
 * country. Every helper here takes the ``Country`` row the phone
 * belongs to instead — the caller decides which row that is:
 * the delivery country in checkout, the address-book form's own
 * country field, or the profile's stored country in account settings
 * (falling back to the first listed country when none is set yet —
 * see ``resolvePhoneCountry``).
 *
 * The country row carries ``phoneCode`` (the E.164 dial code) and
 * ``phoneMetadata`` (``nationalNumberPattern`` / ``possibleLengths`` /
 * ``nationalPrefixForParsing`` / ``exampleMobile``), derived
 * server-side from the exact ``phonenumbers`` library Django
 * validates with (``country/phone.py``) — so these checks stay loose
 * enough that a real customer is never falsely rejected client-side;
 * Django is the authoritative, final check either way. A `+`-prefixed
 * foreign number is always accepted at face value: a Greek mobile may
 * ship to a Cypriot locker, so a foreign country code is never
 * treated as a typo.
 */

/** The subset of a ``Country`` row these helpers need. */
export interface PhoneCountry {
  phoneCode?: number | null
  phoneMetadata?: PhoneMetadata | null
}

/** Loose E.164 check for a number whose country we have no metadata for. */
const FOREIGN_E164 = /^\+[1-9]\d{7,14}$/

/**
 * Resolve the ``Country`` row a phone should be validated against —
 * the exact ``alpha2`` match when one is given, else (opt-in) the
 * first row in the list. Shared by every call site so "which country
 * governs this phone field" is answered the same way everywhere:
 * checkout and the address book pass the field's own country with no
 * fallback (nothing to fall back to — the field is required); the
 * account settings form passes ``fallbackToFirst: true`` because a
 * profile can have no country set yet.
 */
export function resolvePhoneCountry<T extends { alpha2: string }>(
  countries: readonly T[] | null | undefined,
  alpha2: string | null | undefined,
  options: { fallbackToFirst?: boolean } = {},
): T | undefined {
  const list = countries ?? []
  const match = alpha2 ? list.find(country => country.alpha2 === alpha2) : undefined
  if (match) return match
  return options.fallbackToFirst ? list[0] : undefined
}

/**
 * Normalize a phone number to E.164 for the given country.
 *
 * - An already-international ``+…`` number passes through unchanged.
 * - ``00…`` becomes ``+…``.
 * - Otherwise the country's national prefix
 *   (``phoneMetadata.nationalPrefixForParsing``, e.g. Germany's
 *   leading ``0``) is stripped — or, when the country has none, a
 *   single leading ``0`` is stripped as the generic domestic-dialling
 *   guard — then the dial code is prepended.
 * - Exception: if what's left after stripping already starts with the
 *   country's own dial code AND the remainder is one of its valid
 *   national lengths, the input was typed as the dial code without a
 *   leading ``+`` right next to the sticky badge (e.g. "306943413781"
 *   next to a "+30" badge) — re-prefix with ``+`` instead of
 *   double-prefixing into "+3030…". Generalises the old Greek-only
 *   "3030" guard to every country's own length table.
 *
 * Returns ``''`` for empty input so the caller sees "missing" rather
 * than a bare dial code.
 */
export function normalizePhone(
  raw: string | null | undefined,
  country: PhoneCountry | null | undefined,
): string {
  if (!raw) return ''
  const cleaned = String(raw).replace(/[\s\-()]/g, '').trim()
  if (!cleaned) return ''

  if (cleaned.startsWith('+')) return cleaned
  if (cleaned.startsWith('00')) return `+${cleaned.slice(2)}`

  const dialCode = country?.phoneCode
  if (dialCode == null) {
    // No dial code on record for this country row (a placeholder /
    // reserved alpha-2 with no phonenumbers metadata) — strip a bare
    // leading zero and mark the number international so downstream
    // validation sees an E.164-shaped value rather than a silently
    // wrong one.
    return `+${cleaned.replace(/^0+/, '')}`
  }

  const dialCodeStr = String(dialCode)
  const nationalPrefix = country?.phoneMetadata?.nationalPrefixForParsing
  const stripped = nationalPrefix && cleaned.startsWith(nationalPrefix)
    ? cleaned.slice(nationalPrefix.length)
    : cleaned.replace(/^0/, '')

  const possibleLengths = country?.phoneMetadata?.possibleLengths ?? []
  if (stripped.startsWith(dialCodeStr)) {
    const rest = stripped.slice(dialCodeStr.length)
    if (possibleLengths.includes(rest.length)) {
      return `+${stripped}`
    }
  }
  return `+${dialCodeStr}${stripped}`
}

/**
 * Loose plausibility check, applied to the ``normalizePhone`` output
 * — the same value that gets submitted.
 *
 * When the normalized number carries the given country's own dial
 * code, it is checked against that country's ``phoneMetadata``
 * (national-number pattern + possible lengths) — the same
 * ``phonenumbers`` data Django validates with. Any other
 * international number (a different country's phone, e.g. shipping to
 * a locker abroad) only gets a loose E.164 length check, and a
 * country row with no ``phoneMetadata`` (data gap) falls back to the
 * same loose check rather than rejecting a real number.
 */
export function isPlausiblePhone(
  raw: string | null | undefined,
  country: PhoneCountry | null | undefined,
): boolean {
  const normalized = normalizePhone(raw, country)
  if (!normalized) return false

  const dialCode = country?.phoneCode
  const pattern = country?.phoneMetadata?.nationalNumberPattern
  const lengths = country?.phoneMetadata?.possibleLengths
  if (dialCode != null && pattern && lengths?.length) {
    const prefix = `+${dialCode}`
    if (normalized.startsWith(prefix)) {
      const national = normalized.slice(prefix.length)
      return lengths.includes(national.length) && new RegExp(`^(?:${pattern})$`).test(national)
    }
  }
  return FOREIGN_E164.test(normalized)
}

/**
 * Strip the country's own dial code so a pre-populated input can show
 * the local portion next to the visible dial-code badge.
 *
 * - ``+306912345678`` next to a GR badge → ``6912345678``
 * - ``+447911123456`` next to a GR badge → returned as-is (foreign
 *   prefix, nothing to strip for this country)
 * - empty / undefined → empty
 */
export function stripDialCodeForDisplay(
  raw: string | null | undefined,
  country: PhoneCountry | null | undefined,
): string {
  if (!raw) return ''
  const s = String(raw).trim()
  const dialCode = country?.phoneCode
  if (dialCode == null) return s
  const dialCodeStr = String(dialCode)
  if (s.startsWith(`+${dialCodeStr}`)) return s.slice(dialCodeStr.length + 1).trim()
  if (s.startsWith(`00${dialCodeStr}`)) return s.slice(dialCodeStr.length + 2).trim()
  return s
}

/** The sticky leading dial-code badge text (``+30``, ``+357``…) for a country row. */
export function dialCodeLabel(country: PhoneCountry | null | undefined): string {
  return country?.phoneCode != null ? `+${country.phoneCode}` : ''
}
