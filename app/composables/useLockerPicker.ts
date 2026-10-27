/**
 * The carrier-agnostic locker picker, apart from its drawing
 * (`Checkout/GenericLockerPicker` and the tenants' own), for any
 * {@link ShippingCarrier} that sets `usesGenericPicker: true` and exposes
 * `fetchByPostal`.
 *
 * The list searches by postal code (four characters at least) and city,
 * debounced, the newest search aborting the one before; every opening
 * searches again with the checkout's latest address. The map tab, shown
 * when the carrier has `fetchAll`, loads the whole catalogue once, and
 * only while the map is on screen (the picker open AND that tab active).
 * Closing aborts whatever is in flight. A failed search is one line
 * (`errorMessage`, `mapError`), never a toast. The picker never touches
 * provider-specific form state: the carrier's adapter does, from what
 * the drawing emits.
 */
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
  const { t } = useNuxtApp().$i18n

  // The map tab whenever the carrier can draw one, the list otherwise.
  const defaultTab = (): 'list' | 'map' => (props.carrier.fetchAll ? 'map' : 'list')
  const activeTab = ref<'list' | 'map'>(defaultTab())
  const postal = ref(props.initialPostalCode ?? '')
  const city = ref(props.initialCity ?? '')
  const stations = ref<Locker[]>([])
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  const initialSearchDone = ref(false)

  const mapLockers = ref<Locker[]>([])
  const mapLoading = ref(false)
  const mapError = ref<string | null>(null)
  let mapAbort: AbortController | null = null

  let abortController: AbortController | null = null
  const SEARCH_DEBOUNCE_MS = 300

  async function runSearch(): Promise<void> {
    if (!props.carrier.fetchByPostal) {
      errorMessage.value = t('shipping.locker_picker.unsupported')
      return
    }
    const trimmedPostal = postal.value.trim()
    if (trimmedPostal.length < 4) {
      stations.value = []
      return
    }
    abortController?.abort()
    const controller = new AbortController()
    abortController = controller
    loading.value = true
    errorMessage.value = null
    try {
      stations.value = await props.carrier.fetchByPostal({
        postalCode: trimmedPostal,
        city: city.value.trim() || undefined,
        country: props.countryCode,
        signal: controller.signal,
      })
    }
    catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      log.warn({ tag: 'shipping/picker', message: 'locker search failed', error: err })
      errorMessage.value = t('shipping.locker_picker.error')
      stations.value = []
    }
    finally {
      // A search a newer one aborted must not clear the newer one's state.
      if (abortController === controller) {
        loading.value = false
        initialSearchDone.value = true
      }
    }
  }

  const debouncedSearch = useDebounceFn(runSearch, SEARCH_DEBOUNCE_MS)

  watch([postal, city], () => {
    void debouncedSearch()
  })

  // Every opening searches with the latest address: the shopper may have
  // changed it between two openings.
  watch(open, (val) => {
    if (val) {
      if (props.initialPostalCode) postal.value = props.initialPostalCode
      if (props.initialCity) city.value = props.initialCity
      initialSearchDone.value = false
      activeTab.value = defaultTab()
      void runSearch()
    }
    else {
      // Closing cancels whatever is in flight, and with it its loading
      // state: the aborted requests leave that to the one that owns it.
      abortController?.abort()
      abortController = null
      loading.value = false
      mapAbort?.abort()
      mapAbort = null
      mapLoading.value = false
    }
  })

  async function loadAllLockersForMap(): Promise<void> {
    if (!props.carrier.fetchAll) {
      mapError.value = t('shipping.locker_picker.unsupported')
      return
    }
    if (mapLockers.value.length > 0) return
    mapAbort?.abort()
    const controller = new AbortController()
    mapAbort = controller
    mapLoading.value = true
    mapError.value = null
    try {
      const country = (props.countryCode ?? 'GR').toUpperCase()
      mapLockers.value = await props.carrier.fetchAll(country, controller.signal)
    }
    catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      log.warn({ tag: 'shipping/picker', message: 'bulk locker fetch failed', error: err })
      mapError.value = t('shipping.locker_picker.error')
    }
    finally {
      if (mapAbort === controller) mapLoading.value = false
    }
  }

  // The catalogue loads when the map is actually on screen: the picker is
  // mounted (closed) with its card, so a tab-only trigger fetched it on
  // every shipping step, and a load aborted by closing early never
  // retried. `immediate` covers a picker mounted already open.
  watch([open, activeTab], ([isOpen, tab]) => {
    if (isOpen && tab === 'map') void loadAllLockersForMap()
  }, { immediate: true })

  onUnmounted(() => {
    abortController?.abort()
    mapAbort?.abort()
  })

  const tabs = computed(() => [
    {
      label: t('shipping.locker_picker.tab_list'),
      icon: 'i-lucide-list',
      value: 'list',
    },
    ...(props.carrier.fetchAll
      ? [{
          label: t('shipping.locker_picker.tab_map'),
          icon: 'i-lucide-map',
          value: 'map',
        }]
      : []),
  ])

  return {
    activeTab,
    postal,
    city,
    stations,
    loading,
    errorMessage,
    initialSearchDone,
    mapLockers,
    mapLoading,
    mapError,
    tabs,
  }
}
