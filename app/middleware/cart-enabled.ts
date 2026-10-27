/**
 * 404 unless the store has the `cart` feature (`useStoreFeature`).
 * Shop-dark tenants (content site now, eshop later) hide all cart
 * chrome; a direct /cart visit 404s instead of exposing an empty shop
 * surface.
 */
export default createFeatureGate('cart')
