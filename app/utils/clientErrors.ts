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
 * What a browser says when a script chunk cannot be downloaded, whatever
 * the cause (offline, blocker, flaky network): Chrome "Failed to fetch
 * dynamically imported module", Firefox "error loading dynamically
 * imported module", Safari "Importing a module script failed.", Vite's
 * "Unable to preload CSS", webpack's `ChunkLoadError` / "Loading chunk N
 * failed". The visitor's connection failed, not our code, and Nuxt
 * (`experimental.emitRouteChunkError`) already reloads the page.
 */
const CHUNK_LOAD_MESSAGE = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css|loading (?:css )?chunk [\w-]+ failed/i

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
 * name, message, the first stack frames and a NuxtError's status. Query
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
  return serialized
}

/** Whether the error is a chunk download failure in the visitor's browser. */
export function isChunkLoadError(error: SerializedClientError): boolean {
  return error.name === 'ChunkLoadError' || CHUNK_LOAD_MESSAGE.test(error.message)
}

/**
 * `warn` for a chunk that would not download (not ours to fix, still
 * visible), `error` for everything else, which pages the team.
 */
export function levelOf(source: ClientErrorSource, error: SerializedClientError): ClientErrorLevel {
  return source === 'chunk-error' || isChunkLoadError(error) ? 'warn' : 'error'
}

function signatureOf(error: SerializedClientError): string {
  const firstFrame = error.stack?.split('\n').find(line => line.trim().startsWith('at ')) ?? ''
  return `${error.name ?? ''}:${error.message}:${firstFrame.trim()}`
}

/**
 * A reporter that hands each DISTINCT browser error to `send` once per
 * page load, up to `MAX_CLIENT_ERROR_REPORTS`. One error can reach more
 * than one hook (a mount failure is both a Vue error and an app error),
 * and a failing render repeats.
 */
export function createClientErrorReporter(send: (level: ClientErrorLevel, report: ClientErrorReport) => void) {
  const seen = new Set<string>()
  return (source: ClientErrorSource, error: unknown, info?: string) => {
    if (seen.size >= MAX_CLIENT_ERROR_REPORTS) return
    const serialized = serializeClientError(error)
    const signature = signatureOf(serialized)
    if (seen.has(signature)) return
    seen.add(signature)
    send(levelOf(source, serialized), { action: `client:${source}`, error: serialized, ...(info ? { info } : {}) })
  }
}
