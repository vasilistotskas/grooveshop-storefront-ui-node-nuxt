/**
 * Gate for the "My reviews" account page — merchant extra-setting
 * ACCOUNT_REVIEWS_ENABLED (store preference, not a plan flag).
 *
 * History: the page used to hide behind the storefront's
 * superuser-only preview mode, which only hid the MENU LINK — the
 * route itself was reachable by URL for any logged-in customer. The
 * settings gate makes it real: disabled means a hard 404.
 */
export default createSettingGate('ACCOUNT_REVIEWS_ENABLED')
