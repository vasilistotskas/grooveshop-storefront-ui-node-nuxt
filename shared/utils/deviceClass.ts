/**
 * UA → device-class classification, shared by the consumers that must
 * never drift apart:
 *
 * - ``app/plugins/ssr-width.ts`` seeds @vueuse's SSR viewport
 *   width from it, which drives every ``useMediaQuery``/``useDevice``
 *   branch in SSR markup (hero art, mobile bottom nav, device-aware
 *   footer).
 * - ``server/middleware/1.device-class.ts`` stamps it as the
 *   ``x-device-class`` request header, which the cached-SSR route
 *   rules ``varies`` on: the markup varies by this class, so the cache
 *   key must too. Keying on anything less replays desktop HTML to
 *   phones — Lighthouse flagged "Hydration completed but contains
 *   mismatches" and mobile visitors got the desktop hero for the whole
 *   cache lifetime (found live on 2026-08-28, homepage swr rollout).
 * - Cloudflare, when it caches by device type: it keys its edge cache
 *   on its OWN classification of the same User-Agent. These are
 *   Cloudflare's published rules, verbatim and in its order (mobile,
 *   then tablet, else desktop), so a page is always rendered for the
 *   class Cloudflare files it under:
 *   https://developers.cloudflare.com/automatic-platform-optimization/reference/cache-device-type/
 *
 * The `CF-Device-Type` header Cloudflare sends is deliberately NOT
 * trusted for rendering: on any path where Cloudflare does not set it, a
 * client could send its own and have a mobile render cached under the
 * desktop key. It is only logged (`client.edgeDeviceClass`), so a change
 * in Cloudflare's rules shows up as a disagreement in the logs.
 */
export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

export const SSR_WIDTH_BY_DEVICE_CLASS: Readonly<Record<DeviceClass, number>> = {
  mobile: 375,
  tablet: 810,
  desktop: 1280,
}

const CLOUDFLARE_MOBILE = /(?:phone|windows\s+phone|ipod|blackberry|(?:android|bb\d+|meego|silk|googlebot) .+? mobile|palm|windows\s+ce|opera mini|avantgo|mobilesafari|docomo|kaios)/i
const CLOUDFLARE_TABLET = /(?:ipad|playbook|(?:android|bb\d+|meego|silk)(?! .+? mobile))/i

export function deviceClassFromUserAgent(ua: string): DeviceClass {
  if (CLOUDFLARE_MOBILE.test(ua)) return 'mobile'
  if (CLOUDFLARE_TABLET.test(ua)) return 'tablet'
  return 'desktop'
}
