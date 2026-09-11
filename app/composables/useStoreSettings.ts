/**
 * The store's public ``extra_settings`` — ONE fetch per render.
 *
 * Every render used to read its flags and store values one key at a
 * time through ``/api/settings/get``: around thirty internal Nitro
 * requests per page, each a full middleware pass and, in a burst, a
 * Django round trip. That fan-out is what saturated the storefront's
 * event loop under a crawler (Ahrefs 2026-09-11: 2–28 s TTFB, the
 * liveness probe timing out) while Django itself stayed at 0.2 s.
 *
 * Now every reader — ``useSettingFlag``, ``useSettingValue`` and the
 * composables built on them — shares this single ``useFetch`` under the
 * ``store-settings`` key: one request per render, one payload entry
 * per page, and the Nitro route behind it (``server/api/settings/
 * public.get.ts``) caches per tenant so Django answers once a minute
 * per store. Options are fixed here so every caller registers the same
 * entry (Nuxt shares ``data`` across same-key calls only when the
 * options agree).
 *
 * Route middleware and plugins run before any component and cannot
 * register a ``useFetch``; they read the same payload through
 * ``fetchStoreSettings`` below.
 *
 * Fail-soft: a fetch problem yields an empty map and every reader
 * applies its own fallback (see ``parseSettingFlag``). Never a per-key
 * ``server: false`` any more — with a single shared request there is
 * no per-flag cost to keep off the SSR path, and rendering the real
 * value on the server beats a client-side pop-in.
 */
export const STORE_SETTINGS_KEY = 'store-settings'

const EMPTY: PublicSettings = { settings: {} }

export function useStoreSettings() {
  const { data } = useFetch<PublicSettings>('/api/settings/public', {
    key: STORE_SETTINGS_KEY,
    default: () => EMPTY,
    // `dedupe` defaults to 'cancel': every further reader of the SAME
    // key in one render aborts the in-flight request and issues a new
    // one, so N readers cost N requests (the 3x navigation / 2–6x
    // settings-key duplicates in the 2026-09-11 crawl logs). 'defer'
    // makes them wait on the pending request instead — one request,
    // however many readers.
    dedupe: 'defer',
  })

  const settings = computed<Readonly<Record<string, string>>>(
    () => data.value?.settings ?? EMPTY.settings,
  )

  return { settings }
}

/**
 * The same payload for code that runs OUTSIDE a component — a route
 * middleware deciding a 404, a plugin priming a store.
 *
 * On the client the payload already holds the entry from the server
 * render, so a navigation costs nothing. On the server the entry does
 * not exist yet (middleware precedes every component), so this is one
 * internal request to the tenant-cached Nitro route — not a Django
 * round trip. ``useRequestFetch`` forwards the incoming host, which
 * Django needs to resolve the tenant schema (the N1 pattern in
 * MULTI_TENANT_AUDIT.md).
 */
export async function fetchStoreSettings(): Promise<PublicSettings> {
  const cached = useNuxtData<PublicSettings>(STORE_SETTINGS_KEY).data.value
  if (cached) return cached
  return await useRequestFetch()<PublicSettings>('/api/settings/public')
}
