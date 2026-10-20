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

const INP_RATINGS = new Set(['good', 'needs-improvement', 'poor'])
const INP_LOAD_STATES = new Set(['loading', 'dom-interactive', 'dom-content-loaded', 'complete'])
const INP_INTERACTION_TYPES = new Set(['pointer', 'keyboard'])
const INP_SUBPARTS = new Set(['input-delay', 'processing-duration', 'presentation-delay'])
const INP_DURATIONS = [
  'inputDelay',
  'processingDuration',
  'presentationDelay',
  'totalScriptDuration',
  'totalStyleAndLayoutDuration',
  'totalPaintDuration',
  'totalUnattributedDuration',
] as const
/** A page's INP can only be so long before the page is gone; anything over this is not a measurement. */
const MAX_INP_MS = 600_000
/** web-vitals' own bound on a selector (`getSelector`'s `MAX_LEN`). */
const MAX_SELECTOR_LENGTH = 100
const MAX_SCRIPT_TEXT_LENGTH = 300
/**
 * A selector: tag names, `#id`s and classes joined by `>`. Tailwind's
 * classes carry most of ASCII (`[&>svg]:size-4`, `w-1/2`, `bg-(--x)`), so
 * the rule is printable ASCII with no space or quote: never prose.
 */
const SELECTOR = /^[!#-&(-~]+$/
/** A Vue route name (`blog-post-id-slug___el`). */
const ROUTE_NAME = /^[\w-]{1,128}$/
/** A script's file as `scriptSource` gives it: a `/_nuxt/` path, an origin and path with no query, or `document`. */
const SCRIPT_SOURCE = /^(?:\/_nuxt\/[^\s?#]*|https?:\/\/[^\s?#]+|document)$/
/** What called a script: `BUTTON#id.onclick`, `Window.setTimeout`, `Response.json.then`, or a script's file. */
const SCRIPT_INVOKER = /^(?:[\w#.:[\]-]+|\/_nuxt\/[^\s?#]*|https?:\/\/[^\s?#]+)$/
const IDENTIFIER_TEXT = /^[\w$.-]{1,128}$/

function isDuration(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_INP_MS
}

function keptString(value: unknown, pattern: RegExp, maxLength: number): string | undefined {
  return typeof value === 'string' && value.length <= maxLength && pattern.test(value) ? value : undefined
}

function keptLongestScript(value: unknown): InpLongestScript | undefined {
  if (!isRecord(value)) return undefined
  const source = value.source === '' ? '' : keptString(value.source, SCRIPT_SOURCE, MAX_SCRIPT_TEXT_LENGTH)
  const invoker = keptString(value.invoker, SCRIPT_INVOKER, MAX_SCRIPT_TEXT_LENGTH)
  const invokerType = keptString(value.invokerType, IDENTIFIER_TEXT, MAX_KEY_LENGTH)
  const subpart = typeof value.subpart === 'string' && INP_SUBPARTS.has(value.subpart)
    ? value.subpart as InpLongestScript['subpart']
    : undefined
  if (source === undefined || invoker === undefined || invokerType === undefined || !subpart) return undefined
  if (!isDuration(value.duration) || !isDuration(value.forcedStyleAndLayout)) return undefined
  const functionName = keptString(value.functionName, IDENTIFIER_TEXT, MAX_KEY_LENGTH)
  return {
    source,
    invoker,
    invokerType,
    ...(functionName ? { functionName } : {}),
    subpart,
    duration: value.duration,
    forcedStyleAndLayout: value.forcedStyleAndLayout,
  }
}

/**
 * Rebuild a browser's INP report (`action: 'client:inp'`) from the fields
 * an `InpReport` has, each checked against the shape `buildInpReport`
 * gives it, in place. The ingest route takes whatever a client posts, so
 * this is an allowlist too: an unknown field is dropped, and a known one
 * that does not have its shape (free text where a selector belongs, a
 * query string on a script URL) is dropped with it. A report without its
 * value, rating, load state or phase timings is replaced by `REDACTED_BODY`.
 */
export function redactClientInpReport(event: Record<string, unknown>): void {
  if (event.action !== 'client:inp' || event.inp === undefined) return
  const inp = event.inp
  if (
    !isRecord(inp)
    || !isDuration(inp.value)
    || typeof inp.rating !== 'string' || !INP_RATINGS.has(inp.rating)
    || typeof inp.loadState !== 'string' || !INP_LOAD_STATES.has(inp.loadState)
    || !isDuration(inp.inputDelay) || !isDuration(inp.processingDuration) || !isDuration(inp.presentationDelay)
    || !isDuration(inp.longAnimationFrames)
  ) {
    event.inp = REDACTED_BODY
    return
  }

  const kept: Record<string, unknown> = {
    value: inp.value,
    rating: inp.rating,
    loadState: inp.loadState,
    longAnimationFrames: inp.longAnimationFrames,
  }
  for (const key of INP_DURATIONS) {
    if (isDuration(inp[key])) kept[key] = inp[key]
  }
  const route = keptString(inp.route, ROUTE_NAME, 128)
  if (route) kept.route = route
  if (typeof inp.interactionType === 'string' && INP_INTERACTION_TYPES.has(inp.interactionType)) kept.interactionType = inp.interactionType
  const target = keptString(inp.target, SELECTOR, MAX_SELECTOR_LENGTH)
  if (target) kept.target = target
  const longestScript = keptLongestScript(inp.longestScript)
  if (longestScript) kept.longestScript = longestScript
  event.inp = kept
}
