/**
 * Centralised metadata for the checkout shipping-method radio.
 *
 * Why this lives here and not in a Vue component
 * ---------------------------------------------
 * StepShipping renders one card per option and we want to keep the
 * markup free of brand-asset paths so adding a new carrier is just
 *
 *   1. Drop the logo in ``public/img/shipping/<provider>.png``
 *   2. Add an entry to ``SHIPPING_METHOD_META`` + the matching key
 *      in ``ShippingMethodKey``.
 *   3. (Backend) register a ``ShippingCarrierInterface`` adapter and
 *      seed a ``ShippingProvider`` row.
 *
 * Logos live in ``public/`` so Nuxt serves them as static assets at
 * ``/img/shipping/...`` — no Vite asset import (those paths would route
 * through ``_nuxt/@fs/...`` and be rejected by IPX as a forbidden path).
 * Trade-off: no content-hash cache busting on the URL; acceptable for
 * brand assets that change rarely. Add ``?v=N`` if you ever need it.
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
  /** Bundled logo URL — emitted by Vite from the import above. */
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
