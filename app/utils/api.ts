import type { FetchContext } from 'ofetch'
import type { NuxtApp } from '#app'

/**
 * The `onRequest` hook that states the PAGE's locale on a request to the
 * storefront's own `/api`.
 *
 * A browser-originated `/api` call does not carry the page path, and an
 * SSR sub-request is a separate Nitro event that inherits only the page
 * request's headers — nitropack's `event.$fetch` goes through h3
 * `fetchWithEvent`, which forwards headers and not `event.context`
 * (nitro v2 `src/runtime/internal/app.ts`). So the page locale has to
 * travel as a header, and `server/middleware/1.locale.ts` reads it back.
 *
 * `$i18n.locale` is the locale @nuxtjs/i18n resolved for the page being
 * rendered (from its path prefix under `prefix_except_default`), on the
 * server during SSR and in the browser afterwards. It is read when the
 * request is made, not when the hook is created, so a client-side
 * language switch applies to the very next call.
 *
 * The one hook both fetchers use: `$api` (app/plugins/api.ts) and
 * `useApi` / `useLazyApi` (app/composables/useApi.ts).
 */
export function pageLocaleHeader(nuxtApp: NuxtApp) {
  return ({ request, options }: FetchContext): void => {
    if (typeof request === 'string' && request.startsWith('/api/')) {
      options.headers.set('X-Language', nuxtApp.$i18n.locale.value)
    }
  }
}

/**
 * The app's fetcher for the storefront's own `/api`, used wherever the
 * app would otherwise call `$fetch`. `$fetch` itself is deliberately not
 * globally configurable (Nuxt 4 "Custom useFetch" recipe), so the
 * instance lives on the Nuxt app (`app/plugins/api.ts`) and this
 * resolves it at call time.
 *
 * An auto-imported function rather than `useNuxtApp().$api` at every
 * call site, so a call site reads the same as it did with `$fetch` and a
 * test mocks it with `mockNuxtImport('$api', ...)` — a provided
 * `$api` is a non-writable getter (`nuxtApp.provide` → `defineGetter`).
 * `useNuxtApp()` is valid here outside `setup()`: in the browser the app
 * is a singleton (`callWithNuxt` sets it once), and on the server
 * `experimental.asyncContext` carries it across awaits.
 */
export const $api = ((request, options) =>
  useNuxtApp().$api(request, options)) as typeof $fetch
