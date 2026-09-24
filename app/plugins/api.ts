/**
 * Provides `$api`: the `$fetch` instance for the storefront's own `/api`,
 * which states the page's locale on every request (see
 * `pageLocaleHeader` in app/utils/api.ts).
 *
 * Nuxt's recipe for a customised fetcher — `$fetch` is intentionally not
 * globally configurable (https://nuxt.com/docs/4.x/guide/recipes/custom-usefetch).
 * `enforce: 'pre'` so it is provided before any plugin whose stores call
 * `$api` during bootstrap.
 */
export default defineNuxtPlugin({
  name: 'api',
  enforce: 'pre',
  setup(nuxtApp) {
    const api = $fetch.create({
      onRequest: pageLocaleHeader(nuxtApp),
    }) as typeof $fetch

    return { provide: { api } }
  },
})
