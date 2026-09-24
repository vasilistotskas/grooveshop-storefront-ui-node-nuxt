import type { FetchContext } from 'ofetch'
import type { NuxtApp } from '#app'

type OnRequest = (context: FetchContext) => void | Promise<void>

/**
 * The page-locale hook, then the caller's own `onRequest` hooks. Every
 * fetcher here REPLACES a caller's `onRequest` with this list (override
 * mode, or an options spread), so the caller's are merged in rather
 * than silently dropped.
 */
function withPageLocale(nuxtApp: NuxtApp, callerHooks: unknown) {
  return [
    pageLocaleHeader(nuxtApp),
    ...(callerHooks ? [callerHooks as OnRequest | OnRequest[]].flat() : []),
  ]
}

/**
 * `useFetch` for the storefront's own `/api`, stating the page's locale
 * (see `pageLocaleHeader` in app/utils/api.ts).
 *
 * The hook is added as an `onRequest` option rather than by handing
 * `useFetch` the `$api` instance: an explicit `$fetch` option makes
 * `useFetch` skip `useRequestFetch()` during SSR, which is what forwards
 * the visitor's cookies to a local `/api` route (nuxt v4.5.2
 * `app/composables/fetch.ts`: `if (import.meta.server &&
 * !fetchOptions.$fetch)`). Override mode, with the function signature,
 * so `useNuxtApp()` runs at the call site
 * (https://nuxt.com/docs/4.x/api/composables/create-use-fetch).
 */
export const useApi = createUseFetch(callerOptions => ({
  onRequest: withPageLocale(useNuxtApp(), callerOptions.onRequest),
}))

/** `useLazyFetch` for the storefront's own `/api`. See {@link useApi}. */
export const useLazyApi = createUseFetch(callerOptions => ({
  lazy: true,
  onRequest: withPageLocale(useNuxtApp(), callerOptions.onRequest),
}))

/**
 * `useRequestFetch()` for the storefront's own `/api`, stating the
 * page's locale.
 *
 * Kept for what `useRequestFetch` does and `$api` does not: during SSR
 * it forwards the visitor's request headers (host, cookies) to the local
 * route. Call it in setup scope, like `useRequestFetch`.
 */
export function useRequestApi(): typeof $fetch {
  const requestFetch = useRequestFetch()
  const nuxtApp = useNuxtApp()
  return ((request, options) =>
    requestFetch(request, {
      ...options,
      onRequest: withPageLocale(nuxtApp, options?.onRequest),
    })) as typeof $fetch
}
