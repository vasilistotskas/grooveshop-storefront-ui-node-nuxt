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

export type LockerOrigin = GeoPoint & { kind: 'address' | 'location' | 'postcode' }

/** Rows the list draws at most; the rest is "type more". */
export const LOCKER_LIST_LIMIT = 30
/** Nearest lockers the map frames around the origin, with no query. */
const NEAREST_FOCUS_COUNT = 5
const SEARCH_DEBOUNCE_MS = 200
// Placing an address asks the carrier's own API, so it waits for a
// longer pause than the search through the catalogue.
const GEOCODE_DEBOUNCE_MS = 700
// Shorter text is a locker name being typed, never an address to place.
const GEOCODE_MIN_LENGTH = 5

export function useLockerPicker(options: {
  props: {
    carrier: ShippingCarrier
    initialPostalCode?: string
    initialCity?: string
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

  // An address the shopper typed that names no locker («Καλαμά 25»): the
  // carrier places it, as typed and then with the checkout's city, which
  // its geocoder needs beside a street. Only after a longer pause, and
  // only while the search still names no locker.
  const place = shallowRef<(GeocodedPlace & { query: string }) | null>(null)
  const placing = ref(false)
  let placeAbort: AbortController | null = null

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
      place.value = null
      void loadCatalogue()
      if (location.permission.value === 'granted' && location.status.value !== 'located') location.locate()
      return
    }
    abort?.abort()
    abort = null
    loading.value = false
    placeAbort?.abort()
    placing.value = false
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
    placeAbort?.abort()
  })

  // Each locker's search words, folded once per catalogue.
  const searchable = computed(() => lockers.value.map(locker => ({ locker, words: lockerSearchWords(locker) })))
  // Typing waits for the pause; clearing (and every opening, which
  // clears) takes effect at once, so no earlier search outlives it.
  const queryWords = computed(() => searchQueryWords(query.value.trim() ? debouncedQuery.value : ''))
  const searching = computed(() => queryWords.value.length > 0)

  // The search's words matched against each locker, before any origin.
  const textMatches = computed(() => searching.value
    ? searchable.value.filter(entry => matchesQuery(entry.words, queryWords.value)).map(entry => entry.locker)
    : [])

  async function placeAddress(text: string): Promise<void> {
    placeAbort?.abort()
    const geocode = props.carrier.geocode?.bind(props.carrier)
    if (!geocode) return
    const controller = new AbortController()
    placeAbort = controller
    placing.value = true
    try {
      const city = props.initialCity?.trim()
      const attempts = city && !foldSearchText(text).includes(foldSearchText(city)) ? [text, `${text} ${city}`] : [text]
      for (const address of attempts) {
        const found = await geocode(address, controller.signal)
        if (placeAbort !== controller) return
        if (found) {
          place.value = { ...found, query: text }
          return
        }
      }
    }
    catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      // A failed lookup leaves the search as it is: nothing to say beyond
      // "no points found".
      log.warn({ tag: 'shipping/picker', message: 'address lookup failed', error: err })
    }
    finally {
      if (placeAbort === controller) placing.value = false
    }
  }

  watchDebounced(query, (text) => {
    const trimmed = text.trim()
    if (place.value && place.value.query !== trimmed) place.value = null
    if (trimmed.length < GEOCODE_MIN_LENGTH || textMatches.value.length > 0) {
      placeAbort?.abort()
      placing.value = false
      return
    }
    if (place.value?.query === trimmed) return
    void placeAddress(trimmed)
  }, { debounce: GEOCODE_DEBOUNCE_MS })

  // The address found for the search being shown, if it is still that one.
  const placed = computed(() => (place.value && place.value.query === query.value.trim() && textMatches.value.length === 0 ? place.value : null))

  const origin = computed<LockerOrigin | null>(() => {
    if (placed.value) return { lat: placed.value.lat, lng: placed.value.lng, kind: 'address' }
    if (location.position.value) return { ...location.position.value, kind: 'location' }
    const postcode = props.initialPostalCode?.trim()
    const centre = postcode ? postcodeCentre(lockers.value, postcode) : null
    return centre ? { ...centre, kind: 'postcode' } : null
  })

  // A search lists the lockers it names; one that names none but places
  // an address lists the lockers nearest it, like an origin.
  const listsNearest = computed(() => !searching.value || placed.value !== null)

  const matches = computed<LockerResult[]>(() => {
    const from = origin.value
    const found = !listsNearest.value
      ? textMatches.value
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

  const pointsOf = (rows: ReadonlyArray<LockerResult>): GeoPoint[] => rows.flatMap(({ locker }) =>
    locker.lat !== null && locker.lng !== null ? [{ lat: locker.lat, lng: locker.lng }] : [])

  /** Where the map should look: the search's matches; else the origin
   *  and the lockers nearest it (a search that found nothing stays
   *  there too, rather than zooming out); else the whole catalogue. */
  let lastFocus: LngLatBox | null = null
  const focus = computed<LngLatBox | null>(() => {
    const from = origin.value
    let next: LngLatBox | null
    if (!listsNearest.value && matches.value.length > 0) next = boundsOf(pointsOf(matches.value))
    else if (from) {
      const nearest = listsNearest.value ? matches.value : sortedFrom(from)
      next = boundsOf([from, ...pointsOf(nearest.slice(0, NEAREST_FOCUS_COUNT))])
    }
    // A search that found nothing, with nothing to start from: the map
    // stays where it was.
    else next = searching.value ? lastFocus : null
    lastFocus = next
    return next
  })

  function sortedFrom(from: GeoPoint): LockerResult[] {
    return lockers.value
      .flatMap(locker => (locker.lat !== null && locker.lng !== null
        ? [{ locker, distanceKm: distanceKm(from, { lat: locker.lat, lng: locker.lng }) }]
        : []))
      .sort((a, b) => a.distanceKm - b.distanceKm)
  }

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

  // "Near me" replaces whatever the box searched for: the map and the
  // list follow the shopper, not the last search.
  function locate(): void {
    query.value = ''
    location.locate()
  }

  /** The shopper's position, or the address they searched for, for the
   *  map's dot; a postcode draws none. */
  const here = computed<GeoPoint | null>(() => (origin.value && origin.value.kind !== 'postcode' ? origin.value : null))

  /** What the list says it is showing, above the rows. */
  const resultsCaption = computed<string | null>(() => {
    if (placed.value) return t('shipping.locker_picker.nearest_to_address', { address: placed.value.label })
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
    placing,
    canLocate: location.supported,
    locating: computed(() => location.status.value === 'locating'),
    locate,
    locationMessage,
    formatDistance,
  }
}
