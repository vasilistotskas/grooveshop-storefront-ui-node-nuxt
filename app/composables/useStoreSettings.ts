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
 * Now every reader — ``useSettingValue`` and the composables built on
 * it — shares this single ``useFetch`` under the
 * ``store-settings`` key: one request per render, one payload entry
 * per page, and the Nitro route behind it (``server/api/settings/
 * public.get.ts``) caches per tenant so Django answers once a minute
 * per store. Options are fixed here so every caller registers the same
 * entry (Nuxt shares ``data`` across same-key calls only when the
 * options agree).
 *
 * Every public key arrives, with the store's value or the one Django
 * declares, so no reader keeps a default of its own. The structured ones
 * (announcement bar, auth panel, funding banner, offices, opening hours,
 * contact attachment types) arrive typed beside the string map: Django
 * validated them when they were written, so no reader parses a setting.
 * Fail-soft: a fetch problem yields an empty map and none of them. Never a per-key
 * ``server: false`` any more — with a single shared request there is
 * no per-flag cost to keep off the SSR path, and rendering the real
 * value on the server beats a client-side pop-in.
 */
export const STORE_SETTINGS_KEY = 'store-settings'

// The fail-soft payload: nothing configured. A disabled funding banner is
// how Django itself spells "none".
const EMPTY: PublicSettings = {
  settings: {},
  announcementBar: null,
  authPanel: null,
  fundingBanner: { enabled: false },
  storeOffices: [],
  businessHours: null,
  contactAttachmentsTypes: [],
}

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
  const announcementBar = computed(() => data.value?.announcementBar ?? EMPTY.announcementBar)
  const authPanel = computed(() => data.value?.authPanel ?? EMPTY.authPanel)
  const fundingBanner = computed(() => data.value?.fundingBanner ?? EMPTY.fundingBanner)
  const storeOffices = computed(() => data.value?.storeOffices ?? EMPTY.storeOffices)
  const businessHours = computed(() => data.value?.businessHours ?? EMPTY.businessHours)
  const contactAttachmentsTypes = computed(
    () => data.value?.contactAttachmentsTypes ?? EMPTY.contactAttachmentsTypes,
  )

  // Django sends every public key, so an empty map means the lookup
  // failed. Callers that must tell that apart (a route gate renders on
  // it; a menu that hid links would disagree with the pages it links)
  // read `unavailable`.
  const unavailable = computed(() => !!error.value)
  return {
    settings,
    announcementBar,
    authPanel,
    fundingBanner,
    storeOffices,
    businessHours,
    contactAttachmentsTypes,
    unavailable,
  }
}
