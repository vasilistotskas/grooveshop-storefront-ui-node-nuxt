/**
 * Method ↔ carrier mapping for the shipping abstraction.
 *
 * The interface types and the registry primitives auto-import
 * directly from ``./interfaces.ts`` and ``./registry.ts``; this
 * file only adds the small ``carrierForMethod`` / ``methodForCarrier``
 * helpers that bridge the checkout enum to the registry. We
 * deliberately don't re-export from here — Nuxt's auto-import
 * resolver scans every ``shared/`` file individually and a barrel
 * file would shadow the originals (Vite warns "Duplicated imports").
 *
 * Mirror of ``shipping/interfaces.py`` + ``shipping/services.py`` on
 * the backend.
 */
import type { ShippingCarrier } from './interfaces'
import { getCarrier } from './registry'

/**
 * Map a checkout-flow ``shipping_method`` enum value (e.g.
 * ``box_now_locker``, ``acs_smartpoint``, ``home_delivery``) back
 * to the carrier that handles it. ``home_delivery`` returns
 * ``null`` because home delivery is not provider-specific in
 * checkout — Django picks the active home-delivery provider at
 * order-creation time.
 *
 * The mapping lives here (not on each adapter) so future carriers
 * with a non-trivial method-to-code relationship can extend it
 * without forking every consumer.
 */
const METHOD_TO_CODE: Record<string, string> = {
  box_now_locker: 'boxnow',
  acs_smartpoint: 'acs',
}

export function carrierForMethod(
  method: string | null | undefined,
): ShippingCarrier | null {
  if (!method) return null
  const code = METHOD_TO_CODE[method]
  if (!code) return null
  return getCarrier(code)
}

/** Reverse lookup — used by the Zod schema to derive the
 *  ``shipping_method`` enum value from a carrier code. */
export function methodForCarrier(code: string): string | null {
  for (const [method, mapped] of Object.entries(METHOD_TO_CODE)) {
    if (mapped === code) return method
  }
  return null
}

/** Map a live ``/api/v1/shipping/options`` row to the
 *  checkout-flow ``shipping_method`` enum value that the UI uses.
 *
 *  - ``home_delivery`` is provider-agnostic so we collapse any
 *    home-delivery option to the single ``'home_delivery'`` key
 *    regardless of which provider serves it.
 *  - Pickup-point options are provider-specific
 *    (``'boxnow' + 'pickup_point' → 'box_now_locker'``;
 *    ``'acs'    + 'pickup_point' → 'acs_smartpoint'``).
 *
 *  Returns ``null`` for unknown combinations so callers can skip
 *  options the UI doesn't have brand metadata for. Pair with
 *  ``getShippingMethodMeta`` for label/icon lookup. */
export function methodKeyForOption(option: {
  providerCode: string
  kind: string
}): string | null {
  if (option.kind === 'home_delivery') return 'home_delivery'
  if (option.kind === 'pickup_point') {
    return methodForCarrier(option.providerCode)
  }
  return null
}
