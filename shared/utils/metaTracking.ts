/**
 * Helpers shared between client + Nitro server for Meta Pixel
 * deduplication. Browser-only helpers live in ``app/composables`` —
 * everything in here is environment-agnostic.
 */

const FBP_COOKIE = '_fbp'
const FBC_COOKIE = '_fbc'

const COOKIE_REGEX = /([^;=]+)=([^;]*)/g

/**
 * Pull the Meta Pixel cookies out of a ``cookie`` header string.
 *
 * Meta sets ``_fbp`` (browser ID) on every visit and ``_fbc`` (click
 * ID) only when the visitor arrived via a ``?fbclid=...`` URL. Both
 * values must NOT be hashed before being sent to the Conversions
 * API — that's load-bearing per Meta's spec.
 */
export function parseFbpFbcFromCookieHeader(
  cookieHeader: string | undefined | null,
): { fbp?: string, fbc?: string } {
  if (!cookieHeader) return {}
  const cookies: Record<string, string> = {}
  for (const match of cookieHeader.matchAll(COOKIE_REGEX)) {
    const name = match[1]
    const value = match[2]
    if (name == null || value == null) continue
    cookies[name.trim()] = decodeURIComponent(value.trim())
  }
  return {
    fbp: cookies[FBP_COOKIE] || undefined,
    fbc: cookies[FBC_COOKIE] || undefined,
  }
}

/**
 * Read ``_fbp`` / ``_fbc`` from ``document.cookie`` in the browser.
 * Returns an empty object on the server (no document) so call sites
 * can use this in shared code without ``import.meta.client`` guards.
 */
export function readFbpFbcFromBrowser(): { fbp?: string, fbc?: string } {
  if (typeof document === 'undefined') return {}
  return parseFbpFbcFromCookieHeader(document.cookie)
}
