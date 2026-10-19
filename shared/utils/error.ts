/**
 * Zod-free error helpers. Deliberately separated from the
 * ``is*ResponseError`` guards (shared/utils/allAuthErrorGuards.ts):
 * ``serializeError`` is imported by catch blocks all over the app — including the layout/header chunk — and keeping
 * the zod-parsing guards in the same module dragged the zod runtime
 * (16KB brotli) into every page's critical JS graph (2026-08-29
 * mobile-perf pass). Only actual guard consumers should pay for zod.
 */
export interface SerializedError {
  message: string
  statusCode?: number
  statusMessage?: string
  data?: Record<string, unknown>
  /** The failed `/api` response's request id (`requestIdOf`), which a stored error would otherwise lose. */
  requestId?: string
}

export function serializeError(err: unknown): SerializedError {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return {
      message: String(e.message ?? e.statusMessage ?? 'Unknown error'),
      statusCode: typeof e.statusCode === 'number' ? e.statusCode : undefined,
      statusMessage: typeof e.statusMessage === 'string' ? e.statusMessage : undefined,
      data: e.data != null && typeof e.data === 'object' ? e.data as Record<string, unknown> : undefined,
      requestId: requestIdOf(err),
    }
  }
  return { message: String(err) }
}

/**
 * The response header that carries the request's id from the server to the
 * browser (`server/middleware/0.request-id.ts`): the id evlog gives the
 * request and Django receives as `X-Correlation-ID`.
 */
export const REQUEST_ID_HEADER = 'x-request-id'

/**
 * The request id of a failed `/api` call, from its response headers
 * (ofetch's `FetchError.response`), so a browser report can be joined to the
 * server and Django lines of the same request. `undefined` for an error that
 * is not a failed response, or one whose response carried none.
 */
export function requestIdOf(err: unknown): string | undefined {
  if (typeof err !== 'object' || err === null || !('response' in err)) return undefined
  const response = err.response
  if (typeof response !== 'object' || response === null || !('headers' in response)) return undefined
  const headers = response.headers
  if (typeof headers !== 'object' || headers === null || !('get' in headers) || typeof headers.get !== 'function') return undefined
  const id: unknown = headers.get(REQUEST_ID_HEADER)
  return typeof id === 'string' && id ? id : undefined
}
