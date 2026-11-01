import { createError, getRequestHeader, getRequestIP, useRuntimeConfig } from 'nuxt/server'
import type { RequestEvent } from 'nuxt/server'

/** Constant-time string comparison, so the token cannot be guessed from response times. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let mismatch = 0
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return mismatch === 0
}

/**
 * Lets only Django's server-to-server calls through: the shared secret
 * `NUXT_CACHE_PURGE_TOKEN` (`runtimeConfig.cachePurgeToken`) in
 * `X-Cache-Purge-Token`. 401 for a request without it, and when no secret is
 * configured at all, so an unconfigured pod refuses everything instead of
 * everyone. `tag` names the caller in the rejection's log line.
 */
export function requireInternalToken(event: RequestEvent, tag: string): void {
  const expected = (useRuntimeConfig().cachePurgeToken as string | undefined) || ''
  const supplied = getRequestHeader(event, 'x-cache-purge-token') || ''
  if (!expected || !supplied || !timingSafeEqual(expected, supplied)) {
    log.warn({
      tag,
      message: 'Rejected: invalid token',
      ip: getRequestIP(event, { xForwardedFor: true }),
    })
    throw createError({ status: 401, statusText: 'Unauthorized' })
  }
}
