/**
 * The store's active pay ways, ONE entry for every reader: the footer's
 * "Pay with" row and the cart summary's. Readers of one key must pass
 * identical options, so both come here.
 *
 * The REQUEST is gated, not just the render: a store without the cart
 * has no checkout and asks for no pay ways.
 */
export function useStorePayWays() {
  const cartEnabled = useStoreFeature('cart')

  return useApi('/api/pay-way', {
    key: 'footer-pay-ways',
    query: { active: 'true', pageSize: 50 },
    enabled: cartEnabled,
  })
}
