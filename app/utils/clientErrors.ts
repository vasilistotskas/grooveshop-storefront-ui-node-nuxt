/** Where a browser error surfaced. */
export type ClientErrorSource = 'vue-error' | 'app-error' | 'window-error' | 'unhandled-rejection' | 'chunk-error'

/** What `log.<level>` a report goes out at. */
export type ClientErrorLevel = 'error' | 'warn'

/**
 * An error as it goes over the wire. A native `Error` keeps `name`,
 * `message` and `stack` on its prototype, so JSON.stringify (and evlog's
 * client transport) turns it into `{}`; this shape is plain data instead.
 */
export type SerializedClientError = {
  name?: string
  message: string
  stack?: string
  statusCode?: number
  statusMessage?: string
  /** The failed `/api` response's request id, to join this report to the server and Django lines. */
  requestId?: string
}

/**
 * One report as it goes to evlog's client transport. A type alias, not an
 * interface: `log.error` takes a `Record<string, unknown>`, which only an
 * alias satisfies.
 */
export type ClientErrorReport = {
  action: `client:${ClientErrorSource}`
  error: SerializedClientError
  /** Vue's lifecycle hint for a component error ("render function", …). */
  info?: string
  /** The browser cannot run this page at all (`browserCannotRunPage`). */
  unsupportedBrowser?: true
}

/**
 * Distinct reports one page load may send. A component that throws on
 * every render would otherwise post the same error until the ingest
 * route's rate limit cuts the whole page off, hiding the errors after it.
 */
export const MAX_CLIENT_ERROR_REPORTS = 20

/** Bounds on what one report may carry. */
export const MAX_ERROR_MESSAGE_LENGTH = 500
export const MAX_ERROR_STACK_FRAMES = 8
export const MAX_ERROR_STACK_LENGTH = 2000

/**
 * Browser notices that say nothing about our code, reported by no one who
 * can act on them, so they are not reported at all:
 * - "ResizeObserver loop completed with undelivered notifications" (and
 *   the older "loop limit exceeded"): the spec's own benign notice that a
 *   resize was deferred to the next frame;
 * - "Error invoking postMessage: Java object is gone": an Android in-app
 *   browser (Facebook, Instagram) whose bridge object was torn down.
 */
const BROWSER_NOISE_MESSAGE = /^resizeobserver loop (?:completed with undelivered notifications|limit exceeded)\.?$|^error invoking postmessage: java object is gone$/i

/** A URL's query string and fragment can carry tokens: drop them. */
const URL_QUERY = /(https?:\/\/[^\s?#)'"]+)[?#][^\s)'"]*?(?=(?::\d+){1,2}(?:[\s)]|$)|[\s)'"]|$)/g

function redact(text: string): string {
  return text.replace(URL_QUERY, '$1')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function boundedStack(stack: string): string {
  return redact(stack.split('\n').slice(0, MAX_ERROR_STACK_FRAMES + 1).join('\n')).slice(0, MAX_ERROR_STACK_LENGTH)
}

function stringOf(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  }
  catch {
    // Circular structures and BigInt have no JSON form.
    return Object.prototype.toString.call(value)
  }
}

/**
 * Turn whatever a browser hook received into plain, bounded, JSON-safe data:
 * name, message, the first stack frames, a NuxtError's status and the
 * request id of a failed `/api` response. Query
 * strings and fragments are dropped from every URL in it.
 */
export function serializeClientError(error: unknown): SerializedClientError {
  if (!isRecord(error)) return { message: redact(stringOf(error)).slice(0, MAX_ERROR_MESSAGE_LENGTH) }

  const message = typeof error.message === 'string' ? error.message : stringOf(error)
  const serialized: SerializedClientError = { message: redact(message).slice(0, MAX_ERROR_MESSAGE_LENGTH) }
  if (typeof error.name === 'string') serialized.name = error.name
  if (typeof error.stack === 'string') serialized.stack = boundedStack(error.stack)
  if (typeof error.statusCode === 'number') serialized.statusCode = error.statusCode
  if (typeof error.statusMessage === 'string') serialized.statusMessage = redact(error.statusMessage).slice(0, MAX_ERROR_MESSAGE_LENGTH)
  const requestId = requestIdOf(error)
  if (requestId) serialized.requestId = requestId.slice(0, MAX_ERROR_MESSAGE_LENGTH)
  return serialized
}

/** Whether the error is a chunk download failure in the visitor's browser. */
export function isChunkLoadError(error: SerializedClientError): boolean {
  return error.name === 'ChunkLoadError' || isChunkLoadMessage(error.message)
}

/** Whether the error is a `fetch` that got no response in the visitor's browser. */
export function isNoResponseError(error: SerializedClientError): boolean {
  return isNoResponseMessage(error.message)
}

/** Whether the error is a browser notice that is not reported at all. */
export function isBrowserNoise(error: SerializedClientError): boolean {
  return BROWSER_NOISE_MESSAGE.test(error.message.trim())
}

/**
 * `warn` for the visitor's connection failing — a chunk that would not
 * download, a request that got no response — which is not ours to fix
 * but stays visible; `error` for everything else, which pages the team.
 */
export function levelOf(source: ClientErrorSource, error: SerializedClientError): ClientErrorLevel {
  return source === 'chunk-error' || isChunkLoadError(error) || isNoResponseError(error) ? 'warn' : 'error'
}

/**
 * Whether this browser cannot run the page at all: the page resolves its
 * chunks' `#entry` import through an import map (Nuxt's
 * `experimental.entryImportMap`, on by default), and the browser reads
 * none — Safari before 16.4, which also lacks `HTMLScriptElement.supports`
 * before 16. Not one lazy chunk loads there, so every error the page
 * reports follows from it: "Module specifier '#entry' does not start
 * with…", then "$routeBaseName is not a function" from the i18n plugin
 * that could not finish (production, 2026-10-16). The store chose to keep
 * the import map for every other visitor; such a page's reports go out at
 * `warn`, flagged, rather than page the team.
 */
export function browserCannotRunPage(
  page: { querySelector: (selector: string) => unknown },
  scriptElement: { supports?: (type: string) => boolean } | undefined,
): boolean {
  if (!page.querySelector('script[type="importmap"]')) return false
  return !(typeof scriptElement?.supports === 'function' && scriptElement.supports('importmap'))
}

function signatureOf(error: SerializedClientError): string {
  const firstFrame = error.stack?.split('\n').find(line => line.trim().startsWith('at ')) ?? ''
  return `${error.name ?? ''}:${error.message}:${firstFrame.trim()}`
}

/**
 * A reporter that hands each DISTINCT browser error to `send` once per
 * page load, up to `MAX_CLIENT_ERROR_REPORTS`. One error can reach more
 * than one hook (a mount failure is both a Vue error and an app error),
 * and a failing render repeats. Browser noise is not handed over, and on
 * a browser that cannot run the page every report is a flagged `warn`.
 */
export function createClientErrorReporter(
  send: (level: ClientErrorLevel, report: ClientErrorReport) => void,
  options: { unsupportedBrowser?: boolean } = {},
) {
  const seen = new Set<string>()
  return (source: ClientErrorSource, error: unknown, info?: string) => {
    if (seen.size >= MAX_CLIENT_ERROR_REPORTS) return
    const serialized = serializeClientError(error)
    if (isBrowserNoise(serialized)) return
    const signature = signatureOf(serialized)
    if (seen.has(signature)) return
    seen.add(signature)
    const report: ClientErrorReport = { action: `client:${source}`, error: serialized, ...(info ? { info } : {}) }
    if (options.unsupportedBrowser) send('warn', { ...report, unsupportedBrowser: true })
    else send(levelOf(source, serialized), report)
  }
}
