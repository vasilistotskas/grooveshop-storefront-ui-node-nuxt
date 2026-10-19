/**
 * What of a failed response's body may reach the logs from a browser.
 *
 * A browser `log.error({ action, error })` carries the `FetchError`, whose
 * `data` is the response body (evlog 2.33+ serialises it). A field error
 * often echoes what the customer typed ("x@y.z is taken", a phone number,
 * an address), and that must not land in VictoriaLogs. Kept: the keys, which
 * are field names, the stable `code` / `reason` / `type` strings and an
 * allauth `param`, and a numeric `status`. Dropped: every message and
 * every other value.
 */
const KEPT_STRING_KEYS = new Set(['code', 'reason', 'type', 'param'])
const KEPT_NUMBER_KEYS = new Set(['status', 'statusCode'])
/** A code is an identifier, never prose; anything longer or odder is dropped. */
const IDENTIFIER = /^[\w.-]{1,64}$/
const MAX_DEPTH = 6
/** What replaces a body that is not an object: its content is never logged. */
const REDACTED_BODY = '<redacted:body>'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function redactBody(value: unknown, depth = 0): unknown {
  if (depth > MAX_DEPTH) return undefined
  if (Array.isArray(value)) {
    // A list of messages becomes an empty list: the field is named, its text is not.
    return value.map(item => redactBody(item, depth + 1)).filter(item => item !== undefined)
  }
  if (!isRecord(value)) return undefined

  const kept: Record<string, unknown> = {}
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      if (KEPT_STRING_KEYS.has(key) && IDENTIFIER.test(entry)) kept[key] = entry
    }
    else if (typeof entry === 'number') {
      if (KEPT_NUMBER_KEYS.has(key)) kept[key] = entry
    }
    else if (Array.isArray(entry) || isRecord(entry)) {
      kept[key] = redactBody(entry, depth + 1)
    }
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
  if (error === undefined || error === null) return
  if (!isRecord(error)) {
    // A site that logs `error: error.data` where the body is a page or a
    // text echo (a string), or a list: the content may be customer input.
    // Only the fact that there was one survives.
    event.error = typeof error === 'string' || Array.isArray(error) ? REDACTED_BODY : error
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
