/**
 * A coordinate setting read as decimal degrees: an optional minus sign,
 * digits, an optional fraction, and nothing else.
 *
 * `Number.parseFloat` stops at the first stray character ("37.9oops" is
 * 37.9) and `Number('')` is 0, so neither can tell a malformed setting from
 * a place; a malformed value would be published as the store's location.
 *
 * Write-side mirror: `tenant/validators.py` `validate_latitude_setting` /
 * `validate_longitude_setting` in the Django repo — keep the two in sync.
 */
const DECIMAL_DEGREES = /^-?\d{1,3}(\.\d+)?$/

export const LATITUDE_LIMIT = 90
export const LONGITUDE_LIMIT = 180

/** The value in degrees, or `undefined` unless it is one within ±`limit`. */
export function parseDegrees(raw: string, limit: number): number | undefined {
  const text = raw.trim()
  if (!DECIMAL_DEGREES.test(text)) return undefined
  const value = Number(text)
  return Math.abs(value) <= limit ? value : undefined
}
