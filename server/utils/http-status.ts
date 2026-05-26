/**
 * HTTP status classification helpers (auto-imported in the Nitro server).
 */

/**
 * A 4xx is a client error (e.g. unknown-route 404, allauth 401) — worth a
 * `warn`, not the `error` level evlog assigns to any errored request. A 5xx is
 * a genuine server fault and stays `error`. Mirrors evlog's own Datadog
 * severity mapping (`>=500 → error`, `>=400 → warn`).
 */
export function isClientError(error: unknown): boolean {
  const status
    = (error as { statusCode?: unknown, status?: unknown } | null)?.statusCode
      ?? (error as { statusCode?: unknown, status?: unknown } | null)?.status
  return typeof status === 'number' && status >= 400 && status < 500
}
