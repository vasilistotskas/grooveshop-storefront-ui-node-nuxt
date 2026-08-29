/**
 * Zod-free error helpers. Deliberately separated from the
 * ``is*ResponseError`` guards (shared/utils/allAuthErrorGuards.ts):
 * ``getErrorDetail``/``serializeError`` are imported by catch blocks
 * all over the app — including the layout/header chunk — and keeping
 * the zod-parsing guards in the same module dragged the zod runtime
 * (16KB brotli) into every page's critical JS graph (2026-08-29
 * mobile-perf pass). Only actual guard consumers should pay for zod.
 */
export interface SerializedError {
  message: string
  statusCode?: number
  statusMessage?: string
  data?: Record<string, unknown>
}

export function serializeError(err: unknown): SerializedError {
  if (err && typeof err === 'object') {
    const e = err as Record<string, unknown>
    return {
      message: String(e.message ?? e.statusMessage ?? 'Unknown error'),
      statusCode: typeof e.statusCode === 'number' ? e.statusCode : undefined,
      statusMessage: typeof e.statusMessage === 'string' ? e.statusMessage : undefined,
      data: e.data != null && typeof e.data === 'object' ? e.data as Record<string, unknown> : undefined,
    }
  }
  return { message: String(err) }
}

/** Safely pull a user-facing detail string from a thrown ``unknown``.
 *  Reads ``err.data.detail`` (forwarded/returned upstream bodies) first,
 *  then ``err.data.data.detail`` (thrown-route wrapper, when the error
 *  handler keeps ``data``). Returns ``undefined`` otherwise so callers'
 *  ``|| t('fallback')`` renders translated copy.
 *
 *  Deliberately does NOT fall back to ``err.message``: for fetch errors
 *  that is ofetch's ``[POST] "/api/...": 400 Bad Request`` string —
 *  always truthy, so it made every translated fallback dead code and
 *  put raw request lines in front of customers. */
export function getErrorDetail(err: unknown): string | undefined {
  if (err && typeof err === 'object') {
    const detailOf = (candidate: unknown): string | undefined => {
      if (candidate && typeof candidate === 'object' && 'detail' in candidate) {
        const detail = (candidate as Record<string, unknown>).detail
        if (typeof detail === 'string' && detail.length > 0) return detail
      }
      return undefined
    }
    const data = (err as Record<string, unknown>).data
    const nested = data && typeof data === 'object'
      ? (data as Record<string, unknown>).data
      : undefined
    return detailOf(data) ?? detailOf(nested)
  }
  return undefined
}
