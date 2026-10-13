/**
 * Gate for the "My reviews" account page: it belongs to the reviews
 * feature (PRODUCT_REVIEWS_ENABLED — with reviews off Django answers
 * 404 for the shopper's reviews too), and ACCOUNT_REVIEWS_ENABLED can
 * additionally hide just this page. Both are store preferences, not
 * plan flags.
 *
 * History: the page used to hide behind the storefront's
 * superuser-only preview mode, which only hid the MENU LINK — the
 * route itself was reachable by URL for any logged-in customer. The
 * settings gate makes it real: disabled means a hard 404.
 */
export default createSettingGate('PRODUCT_REVIEWS_ENABLED', 'ACCOUNT_REVIEWS_ENABLED')
