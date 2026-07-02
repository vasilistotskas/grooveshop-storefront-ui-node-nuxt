/**
 * Typed wrapper around Nuxt Scripts' ``useScriptMetaPixel``.
 *
 * Why wrap?
 * 1. **Consent gating.** The pixel must not fire until the customer
 *    granted ``ad_storage`` consent through the cookie banner.
 *    ``setupMetaPixelConsent`` in ``setups.ts`` flips the SDK's
 *    consent state when the toggle changes; this composable
 *    short-circuits when the pixel id is missing or consent isn't
 *    granted yet.
 * 2. **Server-side deduplication.** Every ``track*`` method accepts
 *    (and auto-mints) an ``eventID`` so the server-side Conversions
 *    API dispatcher can post the matching server event with the
 *    same id — Meta then dedups the pair and counts one event.
 * 3. **No-op posture in dev / SSR.** Nuxt Scripts already returns a
 *    proxy that's a noop in those contexts; we lean on it so call
 *    sites don't have to ``import.meta.client``-guard.
 *
 * Browser-only events (ViewContent, AddToCart, Search,
 * AddPaymentInfo, CompleteRegistration) live entirely in this file —
 * the server side does not also post them. Browser+server events
 * (InitiateCheckout, Purchase, Refund) need the same eventID on
 * both legs; for InitiateCheckout/Purchase the ids are minted at
 * order creation and stored on the order, so the success page reads
 * them back from ``order.metaEventIds``.
 */

const NOOP_PROXY = new Proxy(() => undefined, {
  get: () => () => undefined,
  apply: () => undefined,
})

type FbqEventName
  = | 'PageView'
    | 'ViewContent'
    | 'AddToCart'
    | 'AddPaymentInfo'
    | 'InitiateCheckout'
    | 'Purchase'
    | 'Search'
    | 'CompleteRegistration'
    | 'Lead'
    | 'Subscribe'

type FbqCustomEventData = Record<string, unknown>

const newEventId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID().replace(/-/g, '')
  }
  // Fallback for very old browsers — content does not need to be
  // cryptographically strong; Meta only uses it as an opaque dedup
  // key.
  return `${Date.now()}${Math.random().toString(16).slice(2)}`
}

/**
 * Translate the camelCase ``MetaCommonData`` fields into the exact
 * snake_case names Meta's pixel + Conversions API expect. Non-trivial:
 * a key mismatch (``contentIds`` vs ``content_ids``) silently
 * disables event matching — Meta drops the field rather than warning.
 * Reference: https://developers.facebook.com/docs/meta-pixel/reference
 */
function toMetaPayload(data: MetaCommonData | undefined): FbqCustomEventData {
  if (!data) return {}
  const out: FbqCustomEventData = {}
  if (data.value !== undefined) out.value = data.value
  if (data.currency !== undefined) out.currency = data.currency
  if (data.contentName !== undefined) out.content_name = data.contentName
  if (data.contentCategory !== undefined) out.content_category = data.contentCategory
  if (data.contentType !== undefined) out.content_type = data.contentType
  if (data.contentIds !== undefined) out.content_ids = data.contentIds
  if (data.numItems !== undefined) out.num_items = data.numItems
  if (data.orderId !== undefined) out.order_id = data.orderId
  if (data.searchString !== undefined) out.search_string = data.searchString
  if (data.status !== undefined) out.status = data.status
  if (data.predictedLtv !== undefined) out.predicted_ltv = data.predictedLtv
  if (data.contents !== undefined) {
    out.contents = data.contents.map(c => ({
      ...(c.id !== undefined ? { id: c.id } : {}),
      ...(c.quantity !== undefined ? { quantity: c.quantity } : {}),
      ...(c.itemPrice !== undefined ? { item_price: c.itemPrice } : {}),
    }))
  }
  return out
}

export function useMetaPixel() {
  const config = useRuntimeConfig()
  const pixelId = (config.public as { metaPixelId?: string })?.metaPixelId

  const isProvisioned = !!pixelId

  // ``useScriptMetaPixel`` is auto-imported by @nuxt/scripts. The
  // consent-gated registration happens once in
  // ``setupMetaPixelConsent`` from ``app.vue`` setup; calls here
  // dedup against ``head._scripts['metaPixel']`` and return the same
  // proxy.
  //
  // ``trigger: 'manual'`` is load-bearing: unhead re-arms the trigger
  // of EVERY duplicate ``useScript`` call on the existing script
  // (``prevScript.setupTriggerHandler(options.trigger)``), and a call
  // without an explicit trigger inherits @nuxt/scripts' module
  // default ``'onNuxtReady'``. This composable is captured at
  // Pinia-store setup (``plugins/setup.ts`` instantiates the cart
  // store during the plugin phase, BEFORE ``app.vue`` setup), so
  // omitting the trigger here attached an unconditional app-ready
  // load that silently bypassed the cookie-consent gate — fbevents.js
  // loaded and fired PageView before the banner was answered
  // (observed in production, 2026-07-02). ``'manual'`` arms nothing,
  // so only the consent trigger from ``setups.ts`` can ever initiate
  // the load; events queue on the ``window.fbq`` stub until then.
  //
  // SSR guard: ``@nuxt/scripts >= 1.2`` removed the implicit SSR
  // no-op posture of the registry proxy — accessing ``.proxy.fbq``
  // now eagerly invokes the registry's ``use()`` which dereferences
  // ``window.fbq`` and throws ``Cannot read properties of undefined``
  // during prerender / SSR. We restore the documented no-op posture
  // by short-circuiting to ``NOOP_PROXY`` on the server. All tracking
  // events are browser-side anyway (events fired from stores/pages
  // run after hydration; server-side Conversions API events are
  // dispatched independently via the backend).
  const proxy = isProvisioned && import.meta.client
    ? useScriptMetaPixel({
      id: pixelId,
      scriptOptions: { trigger: 'manual' },
    }).proxy
    : { fbq: NOOP_PROXY }

  const fbq = (
    cmd: 'track' | 'trackCustom',
    name: FbqEventName | string,
    data?: MetaCommonData,
    options?: MetaTrackOptions,
  ): string | undefined => {
    if (!isProvisioned) return undefined
    const eventID = options?.eventID || newEventId()
    proxy.fbq(cmd, name, toMetaPayload(data), { eventID })
    return eventID
  }

  const trackViewContent = (data: MetaCommonData, options?: MetaTrackOptions) =>
    fbq('track', 'ViewContent', data, options)

  const trackAddToCart = (data: MetaCommonData, options?: MetaTrackOptions) =>
    fbq('track', 'AddToCart', data, options)

  const trackInitiateCheckout = (
    data: MetaCommonData,
    options?: MetaTrackOptions,
  ) => fbq('track', 'InitiateCheckout', data, options)

  const trackAddPaymentInfo = (
    data: MetaCommonData,
    options?: MetaTrackOptions,
  ) => fbq('track', 'AddPaymentInfo', data, options)

  const trackPurchase = (data: MetaCommonData, options?: MetaTrackOptions) =>
    fbq('track', 'Purchase', data, options)

  const trackSearch = (data: MetaCommonData, options?: MetaTrackOptions) =>
    fbq('track', 'Search', data, options)

  const trackCompleteRegistration = (
    data?: MetaCommonData,
    options?: MetaTrackOptions,
  ) => fbq('track', 'CompleteRegistration', data, options)

  const trackLead = (data?: MetaCommonData, options?: MetaTrackOptions) =>
    fbq('track', 'Lead', data, options)

  return {
    isProvisioned,
    newEventId,
    trackViewContent,
    trackAddToCart,
    trackInitiateCheckout,
    trackAddPaymentInfo,
    trackPurchase,
    trackSearch,
    trackCompleteRegistration,
    trackLead,
  }
}
