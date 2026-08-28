/**
 * UA → device-class classification, shared by the ONLY two consumers
 * that must never drift apart:
 *
 * - ``app/plugins/ssr-width.server.ts`` seeds @vueuse's SSR viewport
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
 */
export type DeviceClass = 'mobile' | 'tablet' | 'desktop'

export const SSR_WIDTH_BY_DEVICE_CLASS: Readonly<Record<DeviceClass, number>> = {
  mobile: 375,
  tablet: 810,
  desktop: 1280,
}

export function deviceClassFromUserAgent(ua: string): DeviceClass {
  if (/Mobi/i.test(ua)) return 'mobile'
  if (/iPad|Tablet|Android/i.test(ua)) return 'tablet'
  return 'desktop'
}
