/**
 * Stamps the normalized device class (mobile | tablet | desktop) as a
 * synthetic ``x-device-class`` request header so the cached-SSR route
 * rules (``cache.varies`` in nuxt.config.ts) can key their entries on
 * it. SSR markup genuinely varies by this class — ``ssr-width.server.ts``
 * seeds the SSR viewport width from the SAME classifier
 * (``shared/utils/deviceClass.ts``) — so a host-only cache key replays
 * one class's HTML to the others (hydration mismatches + desktop hero
 * served to phones; found live on 2026-08-28).
 *
 * Set as a REQUEST header (not context) because Nitro's cache ``varies``
 * reads request headers. Overwrites any client-supplied value — the
 * header must never be spoofable into cache poisoning.
 */
export default defineEventHandler((event) => {
  const ua = getRequestHeader(event, 'user-agent') || ''
  event.node.req.headers['x-device-class'] = deviceClassFromUserAgent(ua)
})
