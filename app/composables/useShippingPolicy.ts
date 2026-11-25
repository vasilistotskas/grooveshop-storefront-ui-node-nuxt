/**
 * What the store ships, as Django's public shipping policy lists it: one
 * entry per (provider, kind, country) with its price, free-shipping
 * threshold and delivery days, and for a store that delivers home only to
 * some regions of a country, one per region zone, naming those regions
 * (`ShippingPolicyRow`: their records ride along).
 *
 * ONE entry for every reader (the app shell's schema.org shipping services,
 * the product page's assurances): readers of one key must pass identical
 * options.
 */
export function useShippingPolicy() {
  return useApi('/api/shipping/policy', { key: 'shipping-policy' })
}
