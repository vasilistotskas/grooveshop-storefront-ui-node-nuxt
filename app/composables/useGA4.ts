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
  // The tag is owned by useGoogleTag: one registration shape, tenant-only
  // ids, `trigger: 'manual'` so this consumer never re-arms an early
  // load, and the same denied-by-default consent block everywhere.
  // Before this the composable carried its own registration with
  // `trigger: 'onNuxtReady'` and a platform env fallback for the id —
  // the former silently defeated the interaction/5s trigger in
  // setupGoogleAnalyticsConsent, the latter contradicted the rule that
  // no store-facing id falls back to the platform's.
  const { gaId, gtag: tag } = useGoogleTag()
  const isProvisioned = !!gaId

  const gtag = (name: GA4EventName, params?: GA4Payload): void => {
    if (!isProvisioned) return
    tag('event', name, params ?? {})
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
