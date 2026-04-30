<script lang="ts" setup>
/**
 * Carrier-agnostic Leaflet map view for the locker picker.
 *
 * Why ``.client.vue`` (no SSR): Leaflet imports ``window`` at module
 * load — rendering it server-side throws. The ``.client`` suffix
 * tells Nuxt to ship a Vue stub on the server and the real
 * component only on the client. Wrapping callers should still use
 * ``<ClientOnly>`` for clean hydration boundaries.
 *
 * Tile providers come from carrier metadata (``ShippingProvider.metadata
 * .tile_provider`` on the backend). When metadata is missing or
 * malformed we fall back to CARTO Positron / Dark Matter — both
 * free, both no-API-key, attribution baked in.
 */
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'

const props = defineProps<{
  /** Bulk locker catalogue from ``carrier.fetchAll(country)``. */
  lockers: Locker[]
  /** Optional pre-selected locker (from form state). */
  selectedId?: string | null
  /** Optional map centre + zoom from carrier metadata. */
  defaultCenter?: [number, number] | null
  defaultZoom?: number | null
  /** Tile-layer specs from carrier metadata (light + dark). */
  tileProvider?: {
    light?: TileLayerSpec
    dark?: TileLayerSpec
  } | null
  /** ``true`` while the parent is fetching the catalogue. */
  loading?: boolean
}>()

const emit = defineEmits<{
  selected: [locker: Locker]
}>()

const { t } = useI18n()
const colorMode = useColorMode()
const reducedMotion = usePreferredReducedMotion()

// Stable fallbacks — only used when metadata is missing AND no
// initial centre is computed from the lockers themselves.
const FALLBACK_CENTER: [number, number] = [37.9838, 23.7275] // Athens
const FALLBACK_ZOOM = 11

const FALLBACK_TILES: { light: TileLayerSpec, dark: TileLayerSpec } = {
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd',
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
    subdomains: 'abcd',
  },
}

const lockersWithCoords = computed(() =>
  props.lockers.filter(
    (l): l is Locker & { lat: number, lng: number } =>
      typeof l.lat === 'number' && typeof l.lng === 'number',
  ),
)

const center = computed<[number, number]>(() => {
  if (props.defaultCenter) return props.defaultCenter
  // If carrier metadata didn't ship a centre, derive from the
  // bounding box of the loaded lockers — the map will look
  // sensible even for a brand-new courier.
  const first = lockersWithCoords.value[0]
  if (first) return [first.lat, first.lng]
  return FALLBACK_CENTER
})

const zoom = ref(props.defaultZoom ?? FALLBACK_ZOOM)

const activeTile = computed<TileLayerSpec>(() => {
  const isDark = colorMode.value === 'dark'
  const fromProps = isDark ? props.tileProvider?.dark : props.tileProvider?.light
  return fromProps ?? (isDark ? FALLBACK_TILES.dark : FALLBACK_TILES.light)
})

// LMap component ref — needed to access ``leafletObject`` (the
// underlying ``L.Map`` instance) when wiring marker clusters and
// calling ``invalidateSize()``. Typed as ``any`` because the
// ``@nuxtjs/leaflet`` LMap component's exposed ``leafletObject``
// is a loose subtype of the ``L.Map`` we get from
// ``@types/leaflet``; the official docs use ``ref(null) as any``
// for this exact reason. Casts isolated to this single ref.
const mapRef = ref<any>(null)
const clusterReady = ref(false)
const geolocating = ref(false)

const markerProps = computed(() =>
  lockersWithCoords.value.map((locker) => {
    const html = `
      <div class="acs-pin-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
          <path d="m7.5 4.27 9 5.15"/>
          <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
          <path d="m3.3 7 8.7 5 8.7-5"/>
          <path d="M12 22V12"/>
        </svg>
      </div>`
    return {
      name: locker.name,
      lat: locker.lat,
      lng: locker.lng,
      options: {
        icon: L.divIcon({
          html,
          className: 'acs-pin' + (locker.id === props.selectedId ? ' acs-pin--selected' : ''),
          iconSize: [32, 40],
          iconAnchor: [16, 40],
        }),
        title: locker.name,
        alt: `${locker.name} — ${locker.addressLine1}`,
        keyboard: true,
        riseOnHover: true,
      },
      popup: `
        <div class="acs-popup">
          <strong class="block">${escapeHtml(locker.name)}</strong>
          <span class="block text-sm">${escapeHtml(locker.addressLine1)}</span>
          <span class="block text-xs">${escapeHtml(locker.postalCode)} ${escapeHtml(locker.city)}</span>
          ${locker.workingHours ? `<span class="block mt-1 text-xs italic">${escapeHtml(locker.workingHours)}</span>` : ''}
          <button type="button" class="acs-popup-select mt-2" data-locker-id="${escapeAttr(locker.id)}">
            ${escapeHtml(t('shipping.locker_picker.choose', { carrier: '' }).trim())}
          </button>
        </div>`,
    }
  }),
)

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;',
  }[ch] ?? ch))
}

function escapeAttr(value: string): string {
  return value.replace(/"/g, '&quot;')
}

async function onMapReady(): Promise<void> {
  const map = mapRef.value?.leafletObject
  if (!map) return
  // Disable animations for users who request reduced motion.
  if (reducedMotion.value === 'reduce') {
    map.options.zoomAnimation = false
    map.options.fadeAnimation = false
    map.options.markerZoomAnimation = false
  }
  await ensureClusters()
  // The container may have started sized 0 (modal animation, tab
  // collapsed). Force a recompute on the next frame so tiles
  // resolve cleanly.
  await nextTick()
  map.invalidateSize()
}

async function ensureClusters(): Promise<void> {
  const map = mapRef.value?.leafletObject
  if (!map || markerProps.value.length === 0) return
  // ``useLMarkerCluster`` is auto-imported by ``@nuxtjs/leaflet``
  // when ``leaflet.markerCluster:true`` is set in nuxt.config — no
  // explicit import needed (and reaching into the module's
  // ``dist/runtime`` path breaks vue-tsc).
  await useLMarkerCluster({
    leafletObject: map,
    markers: markerProps.value,
    options: {
      maxClusterRadius: 60,
      chunkedLoading: true,
      disableClusteringAtZoom: 15,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    },
  })
  clusterReady.value = true
}

// Re-cluster when the locker set changes (e.g. country switch).
watch(
  () => props.lockers.length,
  () => {
    void ensureClusters()
  },
)

// Delegate popup-button clicks back to the parent — Leaflet doesn't
// give us a Vue handle inside popup HTML, so we walk the DOM event.
useEventListener(
  import.meta.client ? document : null,
  'click',
  (event: MouseEvent) => {
    const target = event.target as HTMLElement | null
    const button = target?.closest('.acs-popup-select') as
      | HTMLElement
      | null
    if (!button) return
    const id = button.dataset.lockerId
    if (!id) return
    const picked = props.lockers.find(l => l.id === id)
    if (picked) emit('selected', picked)
  },
)

async function geolocate(): Promise<void> {
  const map = mapRef.value?.leafletObject
  if (!import.meta.client || !navigator.geolocation || !map) return
  geolocating.value = true
  try {
    await new Promise<void>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView(
            [pos.coords.latitude, pos.coords.longitude],
            14,
            { animate: reducedMotion.value !== 'reduce' },
          )
          resolve()
        },
        () => reject(new Error('geolocation_denied')),
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      )
    })
  }
  catch {
    log.info('shipping/map', 'geolocation denied or timed out')
  }
  finally {
    geolocating.value = false
  }
}
</script>

<template>
  <div
    role="application"
    :aria-label="t('shipping.locker_picker.modal_title', { carrier: '' })"
    class="relative size-full"
  >
    <!-- Skip-to-list link for keyboard users; the parent picker
         renders the same lockers as a list (WCAG 1.3.1 fallback). -->
    <a
      href="#locker-list"
      class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-1 focus:text-sm focus:font-semibold focus:shadow"
    >
      {{ t('shipping.locker_picker.skip_to_list') }}
    </a>

    <LMap
      ref="mapRef"
      :zoom="zoom"
      :center="center"
      :use-global-leaflet="false"
      class="size-full"
      :options="{
        scrollWheelZoom: true,
        zoomControl: true,
        attributionControl: true,
      }"
      @ready="onMapReady"
    >
      <LTileLayer
        :url="activeTile.url"
        :attribution="activeTile.attribution"
        :options="{
          maxZoom: activeTile.maxZoom ?? 19,
          subdomains: activeTile.subdomains ?? 'abcd',
        }"
        layer-type="base"
      />
    </LMap>

    <!-- Geolocate-me button. Sits over the map; respects
         keyboard focus. -->
    <UButton
      class="absolute right-3 top-3 z-[400] shadow-lg"
      color="neutral"
      variant="solid"
      size="md"
      icon="i-lucide-locate-fixed"
      :loading="geolocating"
      :aria-label="t('shipping.locker_picker.geolocate')"
      @click="geolocate"
    >
      {{ t('shipping.locker_picker.geolocate') }}
    </UButton>

    <!-- Empty state — overlay rather than swap so attribution stays. -->
    <div
      v-if="!loading && lockersWithCoords.length === 0"
      class="absolute inset-x-0 top-1/2 z-[300] mx-auto w-fit -translate-y-1/2 rounded-lg bg-white/90 px-4 py-3 text-center shadow-lg backdrop-blur dark:bg-neutral-900/90"
    >
      <UIcon name="i-lucide-map-pin-off" class="mx-auto size-8 text-neutral-400" />
      <p class="mt-1 text-sm font-medium">
        {{ t('shipping.locker_picker.no_results_in_area') }}
      </p>
    </div>
  </div>
</template>

<style>
.acs-pin {
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.acs-pin .acs-pin-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 9999px;
  background: var(--ui-color-primary-600, #2563eb);
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
  transition: transform 120ms ease;
}

.acs-pin:hover .acs-pin-icon {
  transform: scale(1.08);
}

.acs-pin--selected .acs-pin-icon {
  background: var(--ui-color-success-600, #16a34a);
  outline: 3px solid var(--ui-color-success-300, #86efac);
}

.acs-popup {
  font-family: inherit;
  min-width: 220px;
}

.acs-popup .acs-popup-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  background: var(--ui-color-primary-600, #2563eb);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  border: 0;
}

.acs-popup .acs-popup-select:hover {
  background: var(--ui-color-primary-700, #1d4ed8);
}

@media (prefers-reduced-motion: reduce) {
  .acs-pin:hover .acs-pin-icon {
    transform: none;
  }
}

/* Keyboard focus ring on markers — Leaflet adds tabindex but no
   visible outline by default. */
.leaflet-marker-icon:focus-visible {
  outline: 2px solid var(--ui-color-primary-500, #3b82f6);
  outline-offset: 2px;
}
</style>
