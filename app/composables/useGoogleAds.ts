/**
 * Google Ads conversion events, per tenant.
 *
 * A conversion is `gtag('event', 'conversion', { send_to:
 * 'AW-<id>/<label>', ... })` on the same Google tag GA4 uses (see
 * `useGoogleTag`). The id and the label per action are store data
 * (`TenantConfig.googleAdsConversionId` + `googleAds*Label`); an action
 * with no label is simply not reported, and a store with no id reports
 * nothing at all — no platform fallback.
 *
 * Values are the REAL amounts: the order total on purchase, the line
 * total on add-to-cart, the cart total on begin-checkout. Google's
 * snippet ships `value: 1.0` as a placeholder, and a store that pastes
 * it counts every conversion as one euro.
 *
 * Consent: nothing is gated here on purpose. The tag runs Consent Mode
 * v2 in advanced mode — loaded consent-aware, denied by default, updated
 * from the banner — so with consent denied gtag sends cookieless pings
 * Google uses for conversion modelling, and with it granted the full
 * event. That is Google's required setup for EEA traffic; gating the
 * call here would turn it into basic mode and lose the modelling.
 *
 * Reference:
 * https://developers.google.com/tag-platform/devguides/conversions
 * https://support.google.com/google-ads/answer/12077475 (new_customer)
 */

export type GoogleAdsConversion
  = 'purchase' | 'add_to_cart' | 'begin_checkout' | 'page_view'

export interface GoogleAdsValue {
  value: number
  /** ISO 4217. */
  currency: string
}

export interface GoogleAdsPurchase extends GoogleAdsValue {
  /** Dedup key across client and server legs; the order id. */
  transactionId: string
  /**
   * Whether this is the customer's first order — `Order.isFirstOrder`,
   * computed by the API. Omitted when unknown rather than guessed.
   */
  newCustomer?: boolean
}

export function useGoogleAds() {
  const tenantStore = useTenantStore()
  const { adsId, gtag } = useGoogleTag()

  const labels: Record<GoogleAdsConversion, string> = {
    purchase: tenantStore.googleAdsPurchaseLabel,
    add_to_cart: tenantStore.googleAdsAddToCartLabel,
    begin_checkout: tenantStore.googleAdsBeginCheckoutLabel,
    page_view: tenantStore.googleAdsPageViewLabel,
  }

  const isProvisioned = !!adsId

  /** The `send_to` for an action, or '' when it is not configured. */
  const sendTo = (action: GoogleAdsConversion): string =>
    adsId && labels[action] ? `${adsId}/${labels[action]}` : ''

  const hasConversion = (action: GoogleAdsConversion): boolean =>
    sendTo(action) !== ''

  const convert = (
    action: GoogleAdsConversion,
    params: Record<string, unknown> = {},
  ): void => {
    const target = sendTo(action)
    if (!target) return
    gtag('event', 'conversion', { send_to: target, ...params })
  }

  const trackPurchase = (data: GoogleAdsPurchase) =>
    convert('purchase', {
      value: data.value,
      currency: data.currency,
      transaction_id: data.transactionId,
      ...(typeof data.newCustomer === 'boolean'
        ? { new_customer: data.newCustomer }
        : {}),
    })

  const trackAddToCart = (data: GoogleAdsValue) =>
    convert('add_to_cart', { value: data.value, currency: data.currency })

  const trackBeginCheckout = (data: GoogleAdsValue) =>
    convert('begin_checkout', { value: data.value, currency: data.currency })

  /** No value: a page view has none, and Google's placeholder 1.0 is noise. */
  const trackPageView = () => convert('page_view')

  return {
    isProvisioned,
    hasConversion,
    trackPurchase,
    trackAddToCart,
    trackBeginCheckout,
    trackPageView,
  }
}
