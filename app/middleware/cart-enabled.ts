/**
 * Gate for the cart page — merchant extra-setting CART_ENABLED.
 * Shop-dark tenants (content site now, eshop later) hide all cart
 * chrome; a direct /cart visit 404s instead of exposing an empty
 * shop surface. Fail-open like the other shopper-facing chrome.
 */
export default createSettingGate('CART_ENABLED')
