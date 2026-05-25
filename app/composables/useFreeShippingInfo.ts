/**
 * Free-shipping threshold reader for the PDP and the cart summary.
 *
 * Single source of truth for "Δωρεάν μεταφορικά άνω των X €":
 *   - Calls the Nitro proxy at /api/shipping/free-shipping-info, which
 *     forwards to Django's free-shipping-info endpoint. Each active
 *     carrier owns its own threshold via the carrier-interface hook;
 *     this composable doesn't know — and shouldn't know — which keys
 *     back each threshold.
 *   - Uses a stable cache key so concurrent callers (PDP + cart on
 *     navigation) share the SSR payload and the Nitro cache hit.
 *   - SSR by default — the threshold line is part of the initial
 *     paint so we don't want a layout shift on hydration.
 *
 * Returns the standard useFetch shape so callers can render skeletons
 * during ``pending`` and fall back gracefully when ``data`` is null or
 * carries no advertisable threshold.
 */

export const useFreeShippingInfo = () => {
  return useFetch('/api/shipping/free-shipping-info', {
    key: 'shipping:free-shipping-info',
    method: 'GET',
    headers: useRequestHeaders(),
    // The threshold list rarely changes within a session — let stale
    // data render on subsequent navigations and refresh quietly.
    getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key]
      ?? nuxtApp.static.data[key],
  })
}
