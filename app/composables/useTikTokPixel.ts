/**
 * Typed wrapper around Nuxt Scripts' ``useScriptTikTokPixel``.
 *
 * Why wrap?
 * 1. **Consent gating.** The pixel must not fire until the customer
 *    granted ``ad_storage`` consent through the cookie banner.
 *    ``setupTikTokPixelConsent`` in ``setups.ts`` registers the script
 *    behind the consent trigger; this composable short-circuits when
 *    the pixel id is missing.
 * 2. **No-op posture in dev / SSR.** Same posture as ``useMetaPixel``:
 *    ``@nuxt/scripts >= 1.2`` eagerly invokes the registry's ``use()``
 *    on proxy access, which dereferences ``window.ttq`` and throws
 *    during prerender / SSR — we short-circuit to a noop proxy on the
 *    server so call sites don't have to ``import.meta.client``-guard.
 *
 * All events are browser-only: there is no server-side Events API leg
 * (unlike Meta's Conversions API), so no ``event_id`` dedup is needed.
 *
 * Event names follow TikTok's catalogue — note the purchase event is
 * ``CompletePayment``, not ``Purchase`` (TikTok's ``Purchase`` is a
 * separate offline/shop event and doesn't power web conversion
 * optimisation).
 */

const NOOP_PROXY = new Proxy(() => undefined, {
  get: () => () => undefined,
  apply: () => undefined,
})

type TtqEventName
  = | 'ViewContent'
    | 'AddToCart'
    | 'InitiateCheckout'
    | 'AddPaymentInfo'
    | 'CompletePayment'
    | 'Search'
    | 'CompleteRegistration'
    | 'AddToWishlist'
    | 'PlaceAnOrder'
    | 'Contact'
    | 'Subscribe'

/** Minimal surface of the registry's ``ttq`` proxy that we call. */
type TtqTracker = {
  track: (event: string, properties?: Record<string, unknown>) => void
}

/**
 * Translate the camelCase ``TikTokCommonData`` fields into the exact
 * snake_case names TikTok's pixel expects. A key mismatch
 * (``contentId`` vs ``content_id``) silently disables value/content
 * matching — TikTok drops the field rather than warning.
 * Reference: https://business-api.tiktok.com/portal/docs?id=1739585696931842
 */
function toTikTokPayload(
  data: TikTokCommonData | undefined,
): Record<string, unknown> {
  if (!data) return {}
  const out: Record<string, unknown> = {}
  if (data.value !== undefined) out.value = data.value
  if (data.currency !== undefined) out.currency = data.currency
  if (data.contentId !== undefined) out.content_id = data.contentId
  if (data.contentType !== undefined) out.content_type = data.contentType
  if (data.contentName !== undefined) out.content_name = data.contentName
  if (data.description !== undefined) out.description = data.description
  if (data.query !== undefined) out.query = data.query
  if (data.orderId !== undefined) out.order_id = data.orderId
  if (data.contents !== undefined) {
    out.contents = data.contents.map(c => ({
      content_id: c.contentId,
      ...(c.contentType !== undefined ? { content_type: c.contentType } : {}),
      ...(c.contentName !== undefined ? { content_name: c.contentName } : {}),
      ...(c.price !== undefined ? { price: c.price } : {}),
      ...(c.quantity !== undefined ? { quantity: c.quantity } : {}),
    }))
  }
  return out
}

export function useTikTokPixel() {
  const config = useRuntimeConfig()
  const pixelId = (config.public as { tiktokPixelId?: string })?.tiktokPixelId

  const isProvisioned = !!pixelId

  // ``useScriptTikTokPixel`` is auto-imported by @nuxt/scripts. The
  // consent-gated registration happens once in
  // ``setupTikTokPixelConsent`` from ``app.vue`` setup; calls here
  // dedup against ``head._scripts['tiktokPixel']`` and return the
  // same proxy.
  //
  // ``trigger: 'manual'`` is load-bearing: unhead re-arms the trigger
  // of EVERY duplicate ``useScript`` call on the existing script
  // (``prevScript.setupTriggerHandler(options.trigger)``), and a call
  // without an explicit trigger inherits @nuxt/scripts' module
  // default ``'onNuxtReady'``. Since this composable is captured at
  // Pinia-store setup (plugin phase, before ``app.vue``), omitting
  // the trigger here would attach an unconditional app-ready load —
  // silently bypassing the cookie-consent gate. ``'manual'`` arms
  // nothing, so only the consent trigger from ``setups.ts`` can ever
  // initiate the load; events queue on the ``window.ttq`` stub until
  // then.
  const proxy: { ttq: TtqTracker } = isProvisioned && import.meta.client
    ? useScriptTikTokPixel({
      id: pixelId,
      scriptOptions: { trigger: 'manual' },
    }).proxy
    : { ttq: NOOP_PROXY as unknown as TtqTracker }

  const track = (name: TtqEventName, data?: TikTokCommonData): void => {
    if (!isProvisioned) return
    proxy.ttq.track(name, toTikTokPayload(data))
  }

  const trackViewContent = (data: TikTokCommonData) =>
    track('ViewContent', data)

  const trackAddToCart = (data: TikTokCommonData) => track('AddToCart', data)

  const trackInitiateCheckout = (data: TikTokCommonData) =>
    track('InitiateCheckout', data)

  const trackAddPaymentInfo = (data: TikTokCommonData) =>
    track('AddPaymentInfo', data)

  const trackCompletePayment = (data: TikTokCommonData) =>
    track('CompletePayment', data)

  const trackSearch = (data: TikTokCommonData) => track('Search', data)

  const trackCompleteRegistration = (data?: TikTokCommonData) =>
    track('CompleteRegistration', data)

  return {
    isProvisioned,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackAddPaymentInfo,
    trackCompletePayment,
    trackSearch,
    trackCompleteRegistration,
  }
}
