/**
 * Gate for the cart page — the store's `cart` preference
 * (`TenantConfig.preferences`, setting CART_ENABLED). Shop-dark tenants
 * (content site now, eshop later) hide all cart chrome; a direct /cart
 * visit 404s instead of exposing an empty shop surface.
 */
export default createPreferenceGate('cart')
