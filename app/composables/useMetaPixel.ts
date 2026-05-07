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
  // actual registration (with the consent-gated script trigger)
  // happens once in ``setupMetaPixelConsent`` from ``app.vue`` setup;
  // calls here dedup against ``head._scripts['metaPixel']`` and
  // return the same proxy. Passing options here would race with the
  // setup site if the dedup picks the wrong call's options first
  // (see comment in ``setups.ts:setupMetaPixelConsent`` for the
  // historical incident this avoids).
  const proxy = isProvisioned
    ? useScriptMetaPixel({ id: pixelId }).proxy
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
