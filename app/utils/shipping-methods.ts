/**
 * Per-method UI hints (label / icon / tagline) for the checkout
 * shipping-method radio, plus a single bundled fallback logo.
 *
 * Brand logos at runtime come from the backend —
 * ``ShippingProvider.logo`` (uploaded via Django admin) is surfaced
 * on every ``/api/v1/shipping/options`` row as ``logoUrl``. This
 * module only owns:
 *
 *   1. ``DEFAULT_SHIPPING_LOGO`` — a single neutral SVG used when
 *      the API hasn't returned a logo (fresh deploy without uploaded
 *      assets, SSR before the options call resolves, tests / dev
 *      environments without a live backend).
 *   2. ``SHIPPING_METHOD_META`` — i18n keys + Heroicons name +
 *      optional tagline metadata that aren't brand assets, so they
 *      don't belong in the admin upload surface.
 *
 * Adding a new carrier means: register the ``ShippingCarrierInterface``
 * adapter on the backend, seed a ``ShippingProvider`` row, upload its
 * logo via Django admin. The frontend picks up the new row through
 * the existing options endpoint without code changes here.
 */

/**
 * The set of checkout shipping methods rendered as radio cards. The
 * backend identifies the same carriers via
 * ``order.shippingProvider.code`` + ``order.shippingKind``; this
 * union is purely a presentation key for the radio selector. Auto-
 * imported across ``app/`` and ``shared/``.
 */
export type ShippingMethodKey
  = | 'home_delivery'
    | 'box_now_locker'
    | 'acs_smartpoint'

export interface ShippingMethodMeta {
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
 * Bundled neutral fallback logo. Served as a static asset at
 * ``/img/shipping/default.svg`` (no Vite import — keeps the URL
 * out of ``_nuxt/@fs/...`` which IPX refuses to process). Used
 * by ``resolveShippingLogo`` whenever the backend hasn't supplied
 * a per-provider URL.
 */
export const DEFAULT_SHIPPING_LOGO = '/img/shipping/default.svg'

export const SHIPPING_METHOD_META: Record<ShippingMethodKey, ShippingMethodMeta> = {
  home_delivery: {
    altKey: 'shipping.method.home_delivery.label',
    icon: 'i-heroicons-truck',
  },
  box_now_locker: {
    altKey: 'shipping.method.boxnow.label',
    icon: 'i-lucide-map-pin',
    taglineKey: 'shipping.method.boxnow.tagline',
    taglineColor: 'info',
  },
  acs_smartpoint: {
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

/**
 * Resolve the logo URL for a shipping option: API-supplied value
 * wins, the bundled neutral SVG fills in when the backend hasn't
 * returned one. Pass the matching ``ShippingOption.logoUrl`` from
 * the ``/api/v1/shipping/options`` response (or ``null``/``undefined``
 * if the row hasn't been fetched yet).
 */
export function resolveShippingLogo(apiLogoUrl?: string | null): string {
  return apiLogoUrl || DEFAULT_SHIPPING_LOGO
}
