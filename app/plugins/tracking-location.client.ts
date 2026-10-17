/**
 * Keeps an ad's tags in the address bar of a page the server rendered
 * without them.
 *
 * The server leaves `gclid`, `fbclid`, `utm_*` … out of a cached page's
 * URL (`server/plugins/tracking-params.ts`), so the page says it was
 * rendered for `/products?sort=price` while the browser is at
 * `/products?sort=price&gclid=x`. Nuxt's router starts from the rendered
 * path whenever it has a query of its own, drops the browser's query and
 * replaces the address bar with it — and the pixels, which read the URL
 * once their consent arrives, would never see the click id. (A rendered
 * path with no query is already fine: the router appends the browser's.)
 *
 * So when the browser's URL is exactly the rendered one plus tracking
 * params, the router is told the real URL. A URL that differs in
 * anything else is left to Nuxt, as before.
 *
 * Ordered before `nuxt:router` (`enforce: 'pre'`, order -20), which reads
 * `payload.path` while it is set up.
 */
const sameUrl = (a: string, b: string, origin: string): boolean =>
  new URL(a, origin).href === new URL(b, origin).href

export default defineNuxtPlugin({
  name: 'tracking-location',
  order: -30,
  setup(nuxtApp) {
    const rendered = nuxtApp.payload.path
    if (!rendered) return

    const { pathname, search, origin } = window.location
    const landing = pathname + search
    const withoutTags = withoutTrackingParams(landing)
    if (withoutTags === landing || !sameUrl(withoutTags, rendered, origin)) return

    nuxtApp.payload.path = landing
  },
})
