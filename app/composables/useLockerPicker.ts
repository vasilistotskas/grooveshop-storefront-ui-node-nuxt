/**
 * The carrier-agnostic locker picker, apart from its drawing
 * (`Checkout/GenericLockerPicker` and the tenants' own), for any
 * {@link ShippingCarrier} that sets `usesGenericPicker: true`.
 *
 * Everything reads the carrier's whole catalogue (`fetchAll`), loaded
 * once per country while the picker is open: the one search box above
 * the map and the list, the map, and the distances. Closing aborts a
 * load in flight; a failed load is one line with a retry, never a toast.
 *
 * - **Search** (`query`) matches name, address, city and postcode,
 *   ignoring case, Greek accents and the common Greeklish spellings
 *   (`app/utils/lockerSearch.ts`). The list shows the matches and the
 *   map moves to them (`focus`).
 * - **Origin**: the shopper's position once they ask for it (`locate`),
 *   else the checkout's postcode (`postcodeCentre`). Results are sorted
 *   by distance from it, and with no query the list shows the nearest
 *   and the map frames them around it. The browser is asked for the
 *   position only on the shopper's click, or at opening when the
 *   permission is already granted, so opening never fires a prompt.
 *
 * The picker never touches provider-specific form state: the carrier's
 * adapter does, from what the drawing emits.
 */

/** A row of the list: the locker and how far it is from the origin. */
export interface LockerResult {
  locker: Locker
  distanceKm: number | null
}

export type LockerOrigin = GeoPoint & { kind: 'location' | 'postcode' }

/** Rows the list draws at most; the rest is "type more". */
export const LOCKER_LIST_LIMIT = 30
/** Nearest lockers the map frames around the origin, with no query. */
const NEAREST_FOCUS_COUNT = 5
const SEARCH_DEBOUNCE_MS = 200

export function useLockerPicker(options: {
  props: {
    carrier: ShippingCarrier
    initialPostalCode?: string
    countryCode?: string
  }
  open: Ref<boolean>
}) {
  const { props, open } = options
  const { t, te, locale } = useNuxtApp().$i18n

  const activeTab = ref<'list' | 'map'>('map')
  const query = ref('')
  const debouncedQuery = refDebounced(query, SEARCH_DEBOUNCE_MS)

  const lockers = shallowRef<Locker[]>([])
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  let abort: AbortController | null = null
  let loadedCountry: string | null = null

  const location = useShopperLocation()

  async function loadCatalogue(): Promise<void> {
    if (!props.carrier.fetchAll) {
      errorMessage.value = t('shipping.locker_picker.unsupported')
      return
    }
    // Once per country: the shopper may change the address's country
    // between two openings.
    const country = (props.countryCode ?? 'GR').toUpperCase()
    if (loadedCountry === country && lockers.value.length > 0) return
    // Another country's lockers must never stay on screen, and stay
    // choosable, while this one loads or after it failed.
    if (loadedCountry !== country) {
      lockers.value = []
      loadedCountry = null
    }
    abort?.abort()
    const controller = new AbortController()
    abort = controller
    loading.value = true
    errorMessage.value = null
    try {
      const loaded = await props.carrier.fetchAll(country, controller.signal)
      // A newer load (another country) owns the picker now.
      if (abort !== controller) return
      lockers.value = loaded
      loadedCountry = country
    }
    catch (err: unknown) {
      if (abort !== controller || (err instanceof DOMException && err.name === 'AbortError')) return
      log.warn({ tag: 'shipping/picker', message: 'locker catalogue failed to load', error: err })
      // The server's reason (a throttle names its wait), else ours.
      errorMessage.value = describeApiErrorWith(
        err,
        { t: (key, params) => t(key, params ?? {}), te: key => te(key) },
        { fallback: t('shipping.locker_picker.error') },
      ).description
    }
    finally {
      if (abort === controller) loading.value = false
    }
  }

  // Every opening starts on the map with an empty search, and asks for
  // the position without a prompt when the shopper already allowed it.
  watch(open, (isOpen) => {
    if (isOpen) {
      activeTab.value = 'map'
      query.value = ''
      void loadCatalogue()
      if (location.permission.value === 'granted' && location.status.value !== 'located') location.locate()
      return
    }
    abort?.abort()
    abort = null
    loading.value = false
    location.cancel()
  }, { immediate: true })

  // The permission can resolve after the picker opened (it is read
  // asynchronously) or change while it is open.
  watch(location.permission, (state) => {
    if (open.value && state === 'granted' && location.status.value === 'idle') location.locate()
  })

  // The address's country can change while the picker is open (a saved
  // address checked late): the catalogue follows it.
  watch(() => props.countryCode, () => {
    if (open.value) void loadCatalogue()
  })

  onUnmounted(() => {
    abort?.abort()
  })

  // Each locker's search words, folded once per catalogue.
  const searchable = computed(() => lockers.value.map(locker => ({ locker, words: lockerSearchWords(locker) })))
  const queryWords = computed(() => searchQueryWords(debouncedQuery.value))
  const searching = computed(() => queryWords.value.length > 0)

  const origin = computed<LockerOrigin | null>(() => {
    if (location.position.value) return { ...location.position.value, kind: 'location' }
    const postcode = props.initialPostalCode?.trim()
    const centre = postcode ? postcodeCentre(lockers.value, postcode) : null
    return centre ? { ...centre, kind: 'postcode' } : null
  })

  const matches = computed<LockerResult[]>(() => {
    const from = origin.value
    const found = searching.value
      ? searchable.value.filter(entry => matchesQuery(entry.words, queryWords.value)).map(entry => entry.locker)
      : from ? lockers.value : []
    const rows = found.map(locker => ({
      locker,
      distanceKm: from && locker.lat !== null && locker.lng !== null
        ? distanceKm(from, { lat: locker.lat, lng: locker.lng })
        : null,
    }))
    return from
      ? rows.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
      : rows
  })

  const results = computed(() => matches.value.slice(0, LOCKER_LIST_LIMIT))
  const resultsTotal = computed(() => matches.value.length)

  const placed = (rows: ReadonlyArray<LockerResult>): GeoPoint[] => rows.flatMap(({ locker }) =>
    locker.lat !== null && locker.lng !== null ? [{ lat: locker.lat, lng: locker.lng }] : [])

  /** Where the map should look: the matches, else the origin and the
   *  lockers nearest it, else nowhere in particular (the whole country). */
  const focus = computed<LngLatBox | null>(() => {
    if (searching.value) return boundsOf(placed(matches.value))
    const from = origin.value
    if (!from) return null
    return boundsOf([from, ...placed(matches.value.slice(0, NEAREST_FOCUS_COUNT))])
  })

  const tabs = computed(() => [
    {
      label: t('shipping.locker_picker.tab_list'),
      icon: 'i-lucide-list',
      value: 'list',
    },
    {
      label: t('shipping.locker_picker.tab_map'),
      icon: 'i-lucide-map',
      value: 'map',
    },
  ])

  function retry(): void {
    void loadCatalogue()
  }

  /** The shopper's position, for the map's dot; a postcode draws none. */
  const here = computed<GeoPoint | null>(() => (origin.value?.kind === 'location' ? origin.value : null))

  /** What the list says it is showing, above the rows. */
  const resultsCaption = computed<string | null>(() => {
    if (searching.value) {
      return resultsTotal.value > LOCKER_LIST_LIMIT
        ? t('shipping.locker_picker.results_more', { shown: LOCKER_LIST_LIMIT, total: resultsTotal.value })
        : null
    }
    if (origin.value?.kind === 'location') return t('shipping.locker_picker.nearest_to_you')
    if (origin.value?.kind === 'postcode') {
      return t('shipping.locker_picker.nearest_to_postcode', { postalCode: props.initialPostalCode?.trim() ?? '' })
    }
    return null
  })

  // Why the position is missing, in a line under the search; the search
  // still works whatever it says.
  const locationMessage = computed<string | null>(() => {
    switch (location.status.value) {
      case 'denied': return t('shipping.locker_picker.location_denied')
      case 'unavailable': return t('shipping.locker_picker.location_unavailable')
      default: return null
    }
  })

  const distanceFormat = computed(() => new Intl.NumberFormat(locale.value, {
    style: 'unit',
    unit: 'kilometer',
    maximumFractionDigits: 1,
  }))

  function formatDistance(km: number): string {
    return distanceFormat.value.format(km)
  }

  return {
    activeTab,
    tabs,
    query,
    searching,
    lockers,
    loading,
    errorMessage,
    retry,
    results,
    resultsCaption,
    focus,
    here,
    canLocate: location.supported,
    locating: computed(() => location.status.value === 'locating'),
    locate: location.locate,
    locationMessage,
    formatDistance,
  }
}
