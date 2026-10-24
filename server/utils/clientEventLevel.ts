/**
 * The level a browser event is printed at, settled at the ingest.
 *
 * The browser's global hooks already send a failed connection at `warn`
 * (`levelOf` in `app/utils/clientErrors.ts`), but the 146 store and
 * component sites that log `log.error({ action, error })` themselves do
 * not: a `fetch` that got no response at all (iOS "Load failed", Chrome
 * "Failed to fetch") from `cart:setup` or `auth:setupConfig` reached the
 * logs as an error, 18 of the 24 browser errors in the 3 days to
 * 2026-10-25. Every browser event passes the ingest's `evlog:enrich`
 * hook before evlog prints it on the console method of `event.level`, so
 * the rule lives there, once, for every site.
 */

/** How deep a `cause` chain is followed: ofetch's `FetchError` carries the browser's `TypeError` one level down. */
const MAX_CAUSE_DEPTH = 6

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * Whether the error, or one of its causes, is the visitor's connection
 * failing: a chunk that would not download, or a request that got no
 * response. An error that carries a status had a response, so it is not.
 */
export function isConnectionFailure(error: unknown, depth = 0): boolean {
  if (!isRecord(error) || depth > MAX_CAUSE_DEPTH) return false
  if (typeof error.status === 'number' || typeof error.statusCode === 'number') return false
  const message = typeof error.message === 'string' ? error.message : ''
  if (error.name === 'ChunkLoadError' || isChunkLoadMessage(message) || isNoResponseMessage(message)) return true
  return isConnectionFailure(error.cause, depth + 1)
}

/** An `error` browser event whose error is a failed connection goes out at `warn`, as the global hooks send one. */
export function warnOnConnectionFailure(event: Record<string, unknown>): void {
  if (event.level === 'error' && isConnectionFailure(event.error)) event.level = 'warn'
}
