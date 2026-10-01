/**
 * Delivery-address rules — mirror of Django's `core/validators/address.py`.
 *
 * The postcode format is data, not code: each country row carries
 * `postalCodePattern` (Google's Address Data Service `zip` regex) and
 * `postalCodeExample`, served by the countries API. Django validates
 * every address write against the same row, so the only thing to keep
 * in lockstep here is the normalisation and the two street rules below.
 *
 * Prod order #316 (street "1", street number "70300", a non-numeric
 * postcode) is what each rule is aimed at.
 */

interface PostalFormat {
  postalCodePattern?: string
}

export type AddressIssue = 'zipcode' | 'street' | 'streetNumber'

// A street number this long that also parses as the country's postcode
// is a postcode typed into the wrong field. Four, not five: Cyprus
// postcodes are four digits.
const MIN_POSTCODE_LOOKALIKE_LENGTH = 4

const compiled = new Map<string, RegExp | null>()

/**
 * The pattern as a JavaScript RegExp, or null when JavaScript cannot
 * compile it: the pattern comes from Django, which validates it with
 * Python's ``re`` — a dialect with syntax JavaScript lacks (``(?P<x>…)``,
 * inline flags, possessive quantifiers). Such a pattern is no format to
 * check here; Django still checks every address it is sent.
 */
function patternRegExp(pattern: string): RegExp | null {
  if (!compiled.has(pattern)) {
    let regExp: RegExp | null
    try {
      // Anchored like Python's ``re.fullmatch``. No ``u`` flag: Django
      // compiles with ``re.ASCII``, and without ``u`` JavaScript's ``\d``
      // and ``\b`` are ASCII too.
      regExp = new RegExp(`^(?:${pattern})$`)
    }
    catch {
      regExp = null
    }
    compiled.set(pattern, regExp)
  }
  return compiled.get(pattern) ?? null
}

/**
 * Trimmed, upper-case, internal whitespace collapsed to one space.
 * Collapsed rather than removed: some formats require the space
 * (`FIQQ 1ZZ`), and the ones that allow it make it optional
 * (`\d{3} ?\d{2}`), so `70300` and `703 00` both stay valid.
 */
export function normalizePostcode(value: string): string {
  return value.replace(/\s+/g, ' ').trim().toUpperCase()
}

/**
 * Whether `value` is a valid postcode for `country`. An empty value
 * never matches; a country without a pattern accepts any non-empty
 * value — there is no format to check against.
 */
export function postcodeMatches(country: PostalFormat | undefined, value: string): boolean {
  const postcode = normalizePostcode(value)
  if (!postcode) return false
  return postcodeFormat(country)?.test(postcode) ?? true
}

/** The country's postcode format, or null when there is none to check. */
function postcodeFormat(country: PostalFormat | undefined): RegExp | null {
  const pattern = country?.postalCodePattern
  return pattern ? patternRegExp(pattern) : null
}

/**
 * The address fields that break a rule, in form order. Messages are
 * the caller's (each form owns its i18n); the rules are shared.
 */
export function addressIssues(
  country: PostalFormat | undefined,
  address: { street: string, streetNumber: string, zipcode: string },
): AddressIssue[] {
  const issues: AddressIssue[] = []
  if (address.street && !/\p{L}/u.test(address.street)) {
    issues.push('street')
  }
  // Only against a real format: without one every long number would
  // "look like" a postcode.
  const format = postcodeFormat(country)
  const number = normalizePostcode(address.streetNumber)
  if (
    format
    && number.replace(/ /g, '').length >= MIN_POSTCODE_LOOKALIKE_LENGTH
    && format.test(number)
  ) {
    issues.push('streetNumber')
  }
  if (!postcodeMatches(country, address.zipcode)) {
    issues.push('zipcode')
  }
  return issues
}
