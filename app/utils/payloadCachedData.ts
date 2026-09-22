import type { AsyncDataOptions } from '#app'

/**
 * `getCachedData` for a fetch that lives inside a LAZILY hydrated
 * subtree (`hydrate-on-visible`, `hydrateOnIdle`, the page-builder
 * sections in `componentRegistry`).
 *
 * Nuxt's own default hands back the server payload only while
 * `nuxtApp.isHydrating` is true. A lazily hydrated component runs its
 * setup after the app has finished hydrating — when it scrolls into
 * view — so the default returns nothing, the composable starts with
 * `null`, and the client renders an empty band where the server drew a
 * full one (a hydration node mismatch on the product page's
 * suggestions strip) or, where the fetch is awaited, re-issues the
 * request the server already answered (four extra API calls on the demo
 * homepage's scroll, measured 2026-09-22). The payload is right there in
 * the HTML both times.
 *
 * This is the pending upstream fix (nuxt/nuxt#32443, PR #32447): on the
 * initial read, prefer the payload whatever the hydration state; keep
 * the default's other rules unchanged. Delete this file and every
 * `getCachedData: payloadCachedData` the day Nuxt ships it.
 *
 * Generic over the fetch's data type, so the same function satisfies
 * every call site's `getCachedData` signature; every reader of one key
 * must pass it (Nuxt warns when readers of a key disagree on it).
 */
export function payloadCachedData<T>(
  ...[key, nuxtApp, ctx]: Parameters<NonNullable<AsyncDataOptions<T>['getCachedData']>>
): T | undefined {
  if (nuxtApp.isHydrating || ctx.cause === 'initial') {
    const fromPayload = nuxtApp.payload.data[key]
    if (fromPayload !== undefined) return fromPayload as T
  }
  if (ctx.cause !== 'refresh:manual' && ctx.cause !== 'refresh:hook') {
    return nuxtApp.static.data[key] as T | undefined
  }
  return undefined
}
