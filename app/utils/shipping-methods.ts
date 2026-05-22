/**
 * Centralised FALLBACK metadata for the checkout shipping-method radio.
 *
 * Source of truth for logos at runtime is now the backend —
 * ``ShippingProvider.logo`` (uploaded via Django admin) is surfaced on
 * every ``/api/v1/shipping/options`` row as ``logoUrl``. The map below
 * is the bundled fallback the storefront uses when:
 *  - the operator hasn't uploaded a logo yet (fresh deploy), OR
 *  - the API call fails / a test env has no live backend.
 *
 * The icon (Heroicons name) and the optional tagline keys are kept
 * static here on purpose — they're tiny presentation hints, not brand
 * assets the operator would tune from the admin.
 *
 * Adding a new carrier now: register the ``ShippingCarrierInterface``
 * adapter, seed a ``ShippingProvider`` row, upload its logo via Django
 * admin. Adding an entry here is only needed when you want a bundled
 * fallback PNG/SVG for the static-asset case.
 */

/**
 * The set of checkout shipping methods rendered as radio cards. The
 * backend identifies the same carriers via
 * ``order.shippingProvider.code`` + ``order.shippingKind`` (see
 * ``OrderDetail.shipmentProviderCode`` on the API contract); this
 * union is purely a presentation key for the radio selector and the
 * brand metadata table below. Auto-imported across ``app/`` and
 * ``shared/``.
 */
export type ShippingMethodKey
  = | 'home_delivery'
    | 'box_now_locker'
    | 'acs_smartpoint'

export interface ShippingMethodMeta {
  /** Bundled fallback logo URL — used when the API doesn't return one. */
  logo: string
  /** Alt text i18n key — read at render time via `t()`. */
  altKey: string
  /** Lucide / Heroicons name for the small inline glyph next to the label. */
  icon: string
  /** Optional badge tagline shown next to the label (i18n key). */
  taglineKey?: string
  /** Optional brand color for the tagline badge. */
  taglineColor?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
}

/**
 * Resolve the logo URL for a method, preferring the operator-uploaded
 * value from the API and falling back to the bundled default.
 *
 * Pass the matching ``ShippingOption.logoUrl`` from the API response
 * (or ``null``/``undefined`` if the row hasn't been fetched yet). The
 * fallback keeps the picker rendering during SSR before the options
 * call resolves AND during tests / dev environments without a live
 * backend.
 */
export function resolveShippingMethodLogo(
  method: ShippingMethodKey,
  apiLogoUrl?: string | null,
): string {
  if (apiLogoUrl) return apiLogoUrl
  return SHIPPING_METHOD_META[method].logo
}

export const SHIPPING_METHOD_META: Record<ShippingMethodKey, ShippingMethodMeta> = {
  home_delivery: {
    logo: '/img/shipping/acs.png',
    altKey: 'shipping.method.home_delivery.label',
    icon: 'i-heroicons-truck',
  },
  box_now_locker: {
    logo: '/img/shipping/boxnow.png',
    altKey: 'shipping.method.boxnow.label',
    icon: 'i-lucide-map-pin',
    taglineKey: 'shipping.method.boxnow.tagline',
    taglineColor: 'info',
  },
  acs_smartpoint: {
    logo: '/img/shipping/acs.png',
    altKey: 'shipping.method.acs_smartpoint.label',
    icon: 'i-lucide-map-pin',
    taglineKey: 'shipping.method.acs_smartpoint.tagline',
    taglineColor: 'info',
  },
}

export function getShippingMethodMeta(
  method: ShippingMethodKey,
): ShippingMethodMeta {
  return SHIPPING_METHOD_META[method]
}
