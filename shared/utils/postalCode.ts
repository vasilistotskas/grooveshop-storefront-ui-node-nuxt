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

const compiled = new Map<string, RegExp>()

function patternRegExp(pattern: string): RegExp {
  let regExp = compiled.get(pattern)
  if (!regExp) {
    // Anchored like Python's ``re.fullmatch``. No ``u`` flag: Django
    // compiles with ``re.ASCII``, and without ``u`` JavaScript's ``\d``
    // and ``\b`` are ASCII too.
    regExp = new RegExp(`^(?:${pattern})$`)
    compiled.set(pattern, regExp)
  }
  return regExp
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
  const pattern = country?.postalCodePattern
  if (!pattern) return true
  return patternRegExp(pattern).test(postcode)
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
  const number = normalizePostcode(address.streetNumber)
  if (
    country?.postalCodePattern
    && number.replace(/ /g, '').length >= MIN_POSTCODE_LOOKALIKE_LENGTH
    && postcodeMatches(country, number)
  ) {
    issues.push('streetNumber')
  }
  if (!postcodeMatches(country, address.zipcode)) {
    issues.push('zipcode')
  }
  return issues
}
