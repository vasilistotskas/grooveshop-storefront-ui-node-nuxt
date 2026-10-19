/**
 * What of a failed response's body may reach the logs from a browser.
 *
 * A browser `log.error({ action, error })` carries the `FetchError`, whose
 * `data` is the response body (evlog 2.33+ serialises it). A field error
 * often echoes what the customer typed: an email, a phone number, a
 * postcode, an address. That must not land in VictoriaLogs, so this is an
 * ALLOWLIST, not a list of what to remove: a value survives only if it is
 * one of
 *
 * - a field NAME (a key of the body that is an identifier);
 * - `code` / `reason` / `type` / `param` holding an identifier
 *   (`snake_case` or `camelCase`, bounded);
 * - `status` / `statusCode`, an HTTP status number, and `statusText`, a
 *   short HTTP phrase.
 *
 * Every other value, whatever its type (string, number, boolean, bigint,
 * null), is replaced by `REDACTED_BODY`. Objects and lists are walked for
 * the names and codes inside them, never kept.
 */
const IDENTIFIER_KEYS = new Set(['code', 'reason', 'type', 'param'])
const STATUS_KEYS = new Set(['status', 'statusCode'])
/** `snake_case` or `camelCase`: an identifier, never prose, a number or an address. */
const IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,63}$/
/** A reason phrase of HTTP: letters and single spaces ("Bad Request"). */
const STATUS_TEXT = /^[A-Za-z]+(?: [A-Za-z]+){0,3}$/
const MAX_KEY_LENGTH = 64
const MAX_DEPTH = 6
/** What replaces a value that is not on the allowlist: its content is never logged. */
export const REDACTED_BODY = '<redacted:body>'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isKept(key: string, value: unknown): boolean {
  if (typeof value === 'string') {
    if (IDENTIFIER_KEYS.has(key)) return IDENTIFIER.test(value)
    return key === 'statusText' && value.length <= 40 && STATUS_TEXT.test(value)
  }
  if (typeof value === 'number') {
    return STATUS_KEYS.has(key) && Number.isInteger(value) && value >= 100 && value <= 599
  }
  return false
}

export function redactBody(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return REDACTED_BODY
  if (Array.isArray(value)) return value.map(item => redactBody(item, depth + 1))
  if (!isRecord(value)) return REDACTED_BODY

  const kept: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    // A key that is not an identifier is not a field name: it is data.
    if (key.length > MAX_KEY_LENGTH || !/^[A-Za-z0-9_.-]+$/.test(key)) continue
    kept[key] = Array.isArray(entry) || isRecord(entry)
      ? redactBody(entry, depth + 1)
      : isKept(key, entry) ? entry : REDACTED_BODY
  }
  return kept
}

/**
 * Redact the body an error carries, in place: an error object's `data` (and
 * its `cause`'s), or, for a site that logs the body itself as `error`
 * (`error: error.data`), the whole value.
 */
export function redactClientEventError(event: Record<string, unknown>): void {
  const error = event.error
  if (error === undefined) return
  if (!isRecord(error)) {
    // A site that logs `error: error.data` where the body is a page or a
    // text echo (a string), a number, a list: the content may be customer
    // input. Only the fact that there was one survives.
    event.error = REDACTED_BODY
    return
  }
  const isSerializedError = typeof error.stack === 'string' || typeof error.name === 'string'
  if (!isSerializedError) {
    event.error = redactBody(error)
    return
  }
  redactErrorData(error, 0)
}

function redactErrorData(error: Record<string, unknown>, depth: number): void {
  if ('data' in error) error.data = redactBody(error.data)
  if (isRecord(error.cause) && depth < MAX_DEPTH) redactErrorData(error.cause, depth + 1)
}
