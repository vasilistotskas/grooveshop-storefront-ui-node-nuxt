/**
 * One request per key per server render.
 *
 * `dedupe: 'defer'` joins only readers that arrive while a fetch is in
 * flight. A reader registered after it settled (a child component that
 * sets up once its parent's `await` resolved) goes through
 * `getCachedData`, and Nuxt's default ignores the payload outside
 * hydration, so on the server it fetches the same key again (nuxt v4.5.2
 * `app/composables/asyncData.ts`, createInitialFetch + execute). Measured
 * 2026-09-25: 4-6 `settings/public`, 2 `legal-identity` and 2 product
 * `images` requests per render, a third of all internal requests.
 *
 * The server `nuxtApp` is one render, so the payload entry IS that
 * render's answer for the key; reusing it is always correct, and Nuxt
 * writes it only on success. Server only: on the client a custom
 * `getCachedData` also turns off `purgeCachedData`, and a remount after
 * navigation must keep refetching as it does today.
 *
 * Spread into the options of a `useFetch`/`useAsyncData` together with
 * `dedupe: 'defer'`; a caller's own `getCachedData` always wins.
 */
export function serverRenderCachedData(callerOptions: { getCachedData?: unknown } = {}) {
  return import.meta.server && !callerOptions.getCachedData
    ? { getCachedData: payloadCachedData }
    : {}
}
