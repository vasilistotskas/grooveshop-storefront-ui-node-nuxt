/**
 * Gate for the account favourites page — merchant extra-setting
 * FAVOURITES_ENABLED (store preference, not a plan flag). The hearts
 * across the storefront self-gate inside ButtonProductAddToFavourite;
 * this makes the page itself a hard 404 when the feature is off.
 */
export default createSettingGate('FAVOURITES_ENABLED')
