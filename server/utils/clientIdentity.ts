import type { H3Event } from 'h3'

/**
 * The headers that tell Django WHO is behind a proxied request.
 *
 * Every Nitro → Django call made on a visitor's behalf needs them,
 * whichever fetch helper makes it. They used to live only in
 * `createHeaders()`, so the routes built on `useBackendFetch()` —
 * contact, feedback, gift-card check and purchase — reached Django as
 * the Nuxt pod: `core/client_ip.trusted_client_ip` found no proof of
 * edge, returned `None`, and every scoped throttle on those endpoints
 * fell back to one shared internal address. A single visitor could
 * exhaust a whole store's contact budget, and the gift-card check
 * throttle — the brute-force guard on code guessing — was per store,
 * not per caller.
 *
 * - `X-Real-IP`: Cloudflare's `CF-Connecting-IP` (set on every proxied
 *   request), then `True-Client-IP` (Enterprise), then h3's resolution.
 *   Klipper-lb SNATs the TCP source, so `getRequestIP` alone surfaces
 *   the Flannel gateway in production.
 * - `X-Forwarded-For`: relayed verbatim for Django's audit trail.
 * - `X-Origin-Verify`: the proof-of-edge secret a Cloudflare Transform
 *   Rule stamps on every request that passed the edge. Django believes
 *   no client-IP header without it. Safe to relay: this server is only
 *   reachable through Traefik, so a caller cannot inject a valid one.
 * - `User-Agent`: allauth's session list and the audit log.
 */
export function clientIdentityHeaders(event: H3Event): Record<string, string> {
  const requestHeaders = getRequestHeaders(event)
  const headers: Record<string, string> = {}

  if (requestHeaders['user-agent']) {
    headers['User-Agent'] = requestHeaders['user-agent']
  }

  const clientIp
    = requestHeaders['cf-connecting-ip']
      || requestHeaders['true-client-ip']
      || getRequestIP(event, { xForwardedFor: true })
  if (clientIp) {
    headers['X-Real-IP'] = clientIp
  }

  if (requestHeaders['x-forwarded-for']) {
    headers['X-Forwarded-For'] = requestHeaders['x-forwarded-for']
  }

  if (requestHeaders['x-origin-verify']) {
    headers['X-Origin-Verify'] = requestHeaders['x-origin-verify']
  }

  return headers
}
