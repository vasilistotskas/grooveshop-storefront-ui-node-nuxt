/**
 * Typed wrapper around Nuxt Scripts' ``useScriptGoogleAnalytics``.
 *
 * Why wrap?
 * 1. **Consent gating.** ``setupGoogleAnalyticsConsent`` in
 *    ``setups.ts`` flips the SDK's per-storage consent state when
 *    the cookie banner toggle changes. The pixel SDK queues events
 *    until ``analytics_storage`` is granted; this composable
 *    short-circuits when the GA4 measurement id is missing.
 * 2. **Spec-correct event names.** GA4 silently drops unknown
 *    parameters, so we surface only the official Recommended Event
 *    catalogue (``view_item``, ``add_to_cart``, ``begin_checkout``,
 *    ``purchase`` …) with typed parameter shapes.
 * 3. **No-op posture in dev / SSR.** Nuxt Scripts already returns a
 *    proxy that's a noop in those contexts; we lean on it so call
 *    sites don't have to ``import.meta.client``-guard.
 *
 * Pairing with Meta Pixel: every method here has a Meta equivalent
 * fired from the same call site. Both run side-by-side — they target
 * different ad/analytics ecosystems and don't dedup against each
 * other.
 *
 * Reference:
 * https://developers.google.com/analytics/devguides/collection/ga4/reference/events
 */

const NOOP_PROXY = new Proxy(() => undefined, {
  get: () => () => undefined,
  apply: () => undefined,
})

type GA4EventName
  = | 'page_view'
    | 'view_item'
    | 'view_item_list'
    | 'select_item'
    | 'add_to_cart'
    | 'remove_from_cart'
    | 'view_cart'
    | 'begin_checkout'
    | 'add_shipping_info'
    | 'add_payment_info'
    | 'purchase'
    | 'refund'
    | 'search'
    | 'sign_up'
    | 'login'

type GA4Payload = Record<string, unknown>

export function useGA4() {
  const config = useRuntimeConfig()
  const measurementId
    = (config.public.scripts as { googleAnalytics?: { id?: string } })
      ?.googleAnalytics?.id

  // Real GA4 ids match ``G-`` followed by 8+ alphanumerics. Treat the
  // ``G-XXXXXXXXXX`` placeholder (and any other malformed value) as
  // unprovisioned so @nuxt/scripts never preloads ``gtag.js``.
  const isProvisioned
    = !!measurementId
      && measurementId !== 'G-XXXXXXXXXX'
      && /^G-[A-Z0-9]{8,}$/.test(measurementId)

  // Same as setupGoogleAnalyticsConsent: load on idle so the GA
  // bundle never blocks paint. Multiple ``useScriptGoogleAnalytics``
  // calls dedup at the @nuxt/scripts registry level — they all
  // resolve to the same global proxy.
  const proxy = isProvisioned

    ? (useScriptGoogleAnalytics({
        id: measurementId,
        scriptOptions: { trigger: 'onNuxtReady' },
      }) as any).proxy
    : { gtag: NOOP_PROXY }

  const gtag = (name: GA4EventName, params?: GA4Payload): void => {
    if (!isProvisioned) return
    proxy.gtag('event', name, params ?? {})
  }

  const trackViewItem = (data: GA4CommonData) => gtag('view_item', data)

  const trackViewItemList = (data: GA4ItemListData) =>
    gtag('view_item_list', data)

  const trackSelectItem = (data: GA4SelectItemData) =>
    gtag('select_item', data)

  const trackAddToCart = (data: GA4CommonData) => gtag('add_to_cart', data)

  const trackRemoveFromCart = (data: GA4CommonData) =>
    gtag('remove_from_cart', data)

  const trackViewCart = (data: GA4CommonData) => gtag('view_cart', data)

  const trackBeginCheckout = (data: GA4CheckoutData) =>
    gtag('begin_checkout', data)

  const trackAddShippingInfo = (data: GA4ShippingData) =>
    gtag('add_shipping_info', data)

  const trackAddPaymentInfo = (data: GA4PaymentData) =>
    gtag('add_payment_info', data)

  const trackPurchase = (data: GA4PurchaseData) => gtag('purchase', data)

  const trackRefund = (data: GA4RefundData) => gtag('refund', data)

  const trackSearch = (data: GA4SearchData) => gtag('search', data)

  const trackSignUp = (data?: GA4SignUpData) => gtag('sign_up', data ?? {})

  const trackLogin = (data?: GA4LoginData) => gtag('login', data ?? {})

  return {
    isProvisioned,
    trackViewItem,
    trackViewItemList,
    trackSelectItem,
    trackAddToCart,
    trackRemoveFromCart,
    trackViewCart,
    trackBeginCheckout,
    trackAddShippingInfo,
    trackAddPaymentInfo,
    trackPurchase,
    trackRefund,
    trackSearch,
    trackSignUp,
    trackLogin,
  }
}
