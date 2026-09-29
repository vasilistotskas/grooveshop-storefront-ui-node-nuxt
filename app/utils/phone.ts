/**
 * Country-aware phone-number utilities.
 *
 * Delivery is no longer Greece-only (BoxNow now serves Cyprus lockers
 * too), so a phone number cannot be validated against one hardcoded
 * country. Every helper here takes the ``Country`` row the phone
 * belongs to instead. In checkout that is the country the shopper
 * picked in the phone field (``FormPhoneInput``), which follows the
 * delivery country until they pick one; the address book and account
 * settings use their own country field (falling back to the first
 * listed country when none is set yet — see ``resolvePhoneCountry``).
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
  alpha2?: string
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
 * - Otherwise the country's national prefix is stripped — a pattern
 *   in libphonenumber (``phoneMetadata.nationalPrefixForParsing``:
 *   Germany's ``0``, the UK's ``0|180020``) — and the dial code is
 *   prepended. A country without one keeps its digits, except a
 *   leading ``0`` the number is only valid without — the habit of
 *   writing a Greek number as ``0211…``. The country's own pattern
 *   decides, so an Italian landline, whose leading ``0`` is part of the
 *   number, is left alone.
 * - Exception: if what's left after stripping already starts with the
 *   country's own dial code AND the remainder is one of its valid
 *   national lengths, the input was typed as the dial code without a
 *   leading ``+`` (e.g. "306943413781" for Greece) — re-prefix with ``+`` instead of
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
  const possibleLengths = country?.phoneMetadata?.possibleLengths ?? []
  const pattern = country?.phoneMetadata?.nationalNumberPattern
  const isNational = (digits: string) => Boolean(pattern)
    && possibleLengths.includes(digits.length)
    && new RegExp(`^(?:${pattern})$`).test(digits)
  const isNationalOrDialled = (digits: string) => isNational(digits)
    || (digits.startsWith(dialCodeStr) && isNational(digits.slice(dialCodeStr.length)))

  let stripped = cleaned
  if (nationalPrefix) {
    stripped = cleaned.replace(new RegExp(`^(?:${nationalPrefix})`), '')
  }
  else if (cleaned.startsWith('0') && !isNational(cleaned) && isNationalOrDialled(cleaned.slice(1))) {
    stripped = cleaned.slice(1)
  }

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
 * Temporary: the account forms (address book, profile) still show the local
 * part next to a leading dial-code badge; PR 2 removes this once they move
 * to ``FormPhoneInput``.
 *
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

/** The dial-code text (``+30``, ``+357``…) shown for a country row. */
export function dialCodeLabel(country: PhoneCountry | null | undefined): string {
  return country?.phoneCode != null ? `+${country.phoneCode}` : ''
}

/**
 * Read a typed or pasted ``+<code>…`` / ``00<code>…`` number: the
 * country its dial code names and what follows it.
 *
 * Longest dial code wins (E.164 codes are prefix-free, but the table's
 * own values are not guaranteed to be). Rows that share the winning
 * code (+1, +44, +7) resolve to ``preferredAlpha2`` when it is one of
 * them — the shopper already chose that country, and a bare code cannot
 * tell them apart — else to the first in ``countries``, so list order
 * decides. Returns ``null`` for anything that is not international
 * (a plain national number) or whose code no row carries yet (``+3``
 * on its way to ``+30``).
 */
export function detectPhoneCountry<T extends { alpha2: string, phoneCode?: number | null }>(
  raw: string | null | undefined,
  countries: readonly T[],
  preferredAlpha2?: string | null,
): { country: T, national: string } | null {
  const cleaned = String(raw ?? '').replace(/[\s\-().]/g, '')
  const digits = cleaned.startsWith('+')
    ? cleaned.slice(1)
    : cleaned.startsWith('00') ? cleaned.slice(2) : null
  if (digits === null) return null

  const matches = countries.filter(country =>
    country.phoneCode != null && digits.startsWith(String(country.phoneCode)))
  if (!matches.length) return null

  const longest = Math.max(...matches.map(country => String(country.phoneCode).length))
  const sameCode = matches.filter(country => String(country.phoneCode).length === longest)
  const country = sameCode.find(candidate => candidate.alpha2 === preferredAlpha2) ?? sameCode[0]!
  return { country, national: digits.slice(longest) }
}
