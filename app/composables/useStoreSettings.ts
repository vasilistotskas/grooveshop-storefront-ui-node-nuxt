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

/** Every reader, component or middleware, registers the SAME entry. */
function useStoreSettingsFetch() {
  return useApi<PublicSettings>('/api/settings/public', {
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
}

export function useStoreSettings() {
  const { data, error } = useStoreSettingsFetch()

  const settings = computed<Readonly<Record<string, string>>>(
    () => data.value?.settings ?? EMPTY.settings,
  )

  // "The lookup failed" is a different state from "the key is unset":
  // every route gate renders on the former and applies its own fallback
  // on the latter, and a menu that hides links on a failed lookup would
  // disagree with the pages it links. `settings` alone cannot tell the
  // two apart because the default is an empty map.
  const unavailable = computed(() => !!error.value)
  return { settings, unavailable }
}

/**
 * The same payload for code that runs OUTSIDE a component — a route
 * middleware deciding a 404, a plugin priming a store.
 *
 * It registers the same entry as the components (Nuxt supports this
 * outside a component, in plugins and route middleware), so the first
 * reader of a render issues the one request and every later reader, a
 * middleware or the components after it, reuses its answer. It used to
 * issue its own request each call without storing it, which is how the
 * gates in front of a page each cost one. On the client the entry is
 * already there from the server render. Throws when the lookup failed,
 * so each gate applies its own `onError`.
 */
export async function fetchStoreSettings(): Promise<PublicSettings> {
  const { data, error } = await useStoreSettingsFetch()
  if (error.value) throw error.value
  return data.value
}
