/**
 * Captures the landing page's traffic source for the order it may lead
 * to (see `useOrderAttribution`). Once per page load, and straight from
 * `window.location` at plugin time: that is the URL the browser landed
 * on, before any client navigation could replace it — a deferred read
 * (`onNuxtReady`) would record the second page when the shopper clicks
 * on before the idle callback fires. The landing query survives to this
 * point: browser-language detection is off (`detectBrowserLanguage:
 * false`), so no i18n redirect replaces the URL, and the server's www /
 * canonical-host redirects keep `event.path`, query included.
 *
 * Stored only on a store that can take an order: the value travels with
 * the order and nothing else reads it, so on a store with the cart off
 * it was storage on the visitor's device with no use at all. The gate
 * is the `cart` feature (`TenantConfig.features`), read from the
 * tenant state: this plugin runs before the tenant store is filled.
 */
export default defineNuxtPlugin({
  name: 'attribution',
  parallel: true,
  setup() {
    const { capture } = useOrderAttribution()
    const { location } = window
    const landing = {
      query: Object.fromEntries(new URLSearchParams(location.search)),
      referrer: document.referrer,
      landingPath: location.pathname,
      ownOrigin: location.origin,
    }

    if (storeFeatureOn(useTenant().value, 'cart')) capture(landing)
  },
})
