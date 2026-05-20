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
// Leaflet 1.9.4 ships an ESM build with **named exports only** — no
// ``export default``. Under ``future.compatibilityVersion: 5`` Vite
// no longer adds a synthetic default-export interop, so any
// top-level ``import L from 'leaflet'`` (or ``import * as L``)
// triggers the build error or hits the read-only-namespace problem
// when ``leaflet.markercluster`` tries to patch ``L`` at runtime.
//
// Match the upstream pattern (see ``@nuxtjs/leaflet``'s reference
// usage at https://nuxt.com/modules/leaflet): keep ``leaflet`` out
// of the static module graph via ``import type`` so the type system
// has the shape; load the runtime module via dynamic ``import()``
// on the client and gate the template on ``isLeafletReady`` so no
// Leaflet API is read before the module resolves.
import type * as Leaflet from 'leaflet'
import 'leaflet/dist/leaflet.css'
// ``leaflet.markercluster`` CSS is intentionally imported here
// (the JS side-effect is handled inside ``ensureClusters`` via a
// dynamic ``import()`` — manually importing the JS at the top of
// the script section races the ``<LMap>`` mount that seeds
// ``window.L`` and breaks the plugin's ``L.FeatureGroup.extend``
// call).
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

// Surfaced to the user when the browser denies geolocation or the
// request times out — the silent ``log.info`` path left users
// staring at a button that span and stopped with no explanation.
const geolocateError = ref<string | null>(null)

// SVG body is identical for every marker — render once and reuse.
const PIN_HTML = `
  <div class="acs-pin-icon" aria-hidden="true">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
      <path d="m7.5 4.27 9 5.15"/>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/>
      <path d="m3.3 7 8.7 5 8.7-5"/>
      <path d="M12 22V12"/>
    </svg>
  </div>`

// Leaflet runtime — populated by a client-only dynamic import inside
// ``onMounted`` below. ``isLeafletReady`` gates the template so
// ``<LMap>`` (and every downstream ``leaflet`` API call) only mount
// after the module is available. This mirrors the seajets reference
// implementation (``app/components/Map/Agencies.vue``).
//
// CRITICAL: the load MUST happen inside ``onMounted``, NOT at module
// scope. Loading at module scope makes the leaflet chunk a transitive
// dependency of every component that auto-imports
// ``CheckoutSmartpointMap`` — Nuxt's manifest then preloads the
// chunk on every page, which in turn pulls the markercluster plugin
// chunk in (via its export-name resolution graph), and the plugin's
// UMD wrapper does a bare ``L`` lookup at module-eval time. Without
// ``window.L`` seeded first, that lookup throws ``L is not defined``
// and freezes the page (production outage at v3.123.0, fixed in
// v3.123.x by deferring to ``onMounted`` + seeding ``window.L``).
let leaflet: typeof Leaflet | null = null
let iconNormal: Leaflet.DivIcon | null = null
let iconSelected: Leaflet.DivIcon | null = null
const isLeafletReady = ref(false)

onMounted(async () => {
  leaflet = await import('leaflet')
  // Seed ``window.L`` immediately so any subsequent dynamic import
  // of ``leaflet.markercluster`` (or any other UMD plugin that does
  // ``L.X = L.Y.extend(...)`` at module load) can resolve the bare
  // ``L`` lookup through global scope. vue-leaflet does the same
  // assignment when ``<LMap :use-global-leaflet="true">`` mounts,
  // but the markercluster chunk can be evaluated before that point
  // if Vite has emitted a modulepreload for it — pre-seeding here
  // is defence in depth.
  ;(window as unknown as { L: typeof Leaflet }).L = leaflet
  iconNormal = leaflet.divIcon({
    html: PIN_HTML,
    className: 'acs-pin',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  })
  iconSelected = leaflet.divIcon({
    html: PIN_HTML,
    className: 'acs-pin acs-pin--selected',
    iconSize: [32, 40],
    iconAnchor: [16, 40],
  })
  isLeafletReady.value = true
})

// Marker props are independent of ``selectedId`` — selection state is
// applied via ``setIcon`` on the affected markers without rebuilding
// the cluster. The previous implementation re-evaluated the whole
// computed (and re-instantiated 167 ``L.divIcon`` objects) on every
// selection change.
const markerProps = computed(() =>
  lockersWithCoords.value.map(locker => ({
    id: locker.id,
    name: locker.name,
    lat: locker.lat,
    lng: locker.lng,
    options: {
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
  })),
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

// When the map is mounted inside a hidden tab panel, Leaflet
// computes its tile grid against a 0×0 container and only renders
// a single tile. The ``@ready`` callback above fires once at mount;
// after that, the only signal we get when the panel becomes
// visible is the container resizing from 0×N to its real
// dimensions. Watch that via ``useResizeObserver`` and re-call
// ``invalidateSize`` whenever the width/height transitions through
// 0 — covers the tab-activate path, the modal-fullscreen-snap
// path, and any future drawer/sheet animation that changes the
// visible viewport.
const mapContainerRef = computed<HTMLElement | null>(
  () => mapRef.value?.leafletObject?.getContainer?.() ?? null,
)
let lastDim = { w: 0, h: 0 }
useResizeObserver(mapContainerRef, (entries) => {
  const entry = entries[0]
  if (!entry) return
  const { width, height } = entry.contentRect
  // Only act on a 0 → non-0 transition (or the inverse). Resizing
  // a visible map repeatedly would trigger redundant work.
  const wasHidden = lastDim.w === 0 || lastDim.h === 0
  const isVisible = width > 0 && height > 0
  lastDim = { w: width, h: height }
  if (wasHidden && isVisible) {
    const map = mapRef.value?.leafletObject
    if (!map) return
    map.invalidateSize()
    // Re-cluster too in case the markers were skipped on first
    // mount because the container was 0-sized. ``ensureClusters``
    // is idempotent — re-entry is safe.
    void ensureClusters()
  }
})

// Tracks the current cluster layer so we can swap it out cleanly
// when the locker set changes (country switch, refresh, etc.) —
// otherwise we'd stack pins on every reload.
let activeCluster: any = null
// Cache the built marker per locker id so a selection change can
// flip its icon in place instead of rebuilding the whole cluster.
const markersById = new Map<string, any>()
// In-flight guard: ``onMapReady``, ``useResizeObserver``, and the
// ``props.lockers`` watcher can all call ``ensureClusters`` in the
// same tick. Without this, two cluster groups would be added to
// the map and only the latest tracked for removal — orphaned pins.
let clusterBuilding = false

async function ensureClusters(): Promise<void> {
  if (clusterBuilding) return
  const map = mapRef.value?.leafletObject
  if (!map || markerProps.value.length === 0 || !leaflet || !iconNormal || !iconSelected) return
  clusterBuilding = true
  try {
    if (activeCluster) {
      map.removeLayer(activeCluster)
      activeCluster = null
    }
    markersById.clear()
    // ``leaflet.markercluster`` is a UMD plugin: the top of its
    // wrapper does ``var t = L.MarkerClusterGroup = L.FeatureGroup.extend(...)``
    // with **bare ``L``** — resolved via JS scope walk. Inside a
    // Vite-bundled chunk that scope walk lands on a chunk-level ``L``
    // binding only when something in the same chunk statically does
    // ``import L from 'leaflet'``. With the dynamic-import refactor
    // there's no such static binding, so the walk falls through to
    // ``globalThis.L`` — undefined unless something else has seeded
    // it. Seed ``window.L`` from the freshly-loaded module so the
    // plugin's top-level statements can resolve it. vue-leaflet does
    // the same when ``<LMap :use-global-leaflet="true">`` mounts, but
    // by the time ``ensureClusters`` runs ``onMapReady`` has fired and
    // it's already done — this assignment is a no-op then.
    ;(window as unknown as { L: typeof Leaflet }).L = leaflet
    // The ``@types/leaflet.markercluster`` package only declares
    // ``MarkerClusterGroup`` as an ambient ``L.MarkerClusterGroup``,
    // not as a module-level export. The runtime module DOES expose
    // it (verified in ``leaflet.markercluster/dist/leaflet.markercluster.js``:
    // ``e.MarkerClusterGroup = t``), so cast through ``unknown``.
    const { MarkerClusterGroup } = (await import('leaflet.markercluster')) as unknown as {
      MarkerClusterGroup: new (opts: object) => Leaflet.FeatureGroup
    }
    const markerCluster = new MarkerClusterGroup({
      maxClusterRadius: 60,
      chunkedLoading: true,
      disableClusteringAtZoom: 15,
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
    })
    for (const m of markerProps.value) {
      const icon = m.id === props.selectedId ? iconSelected : iconNormal
      const marker = leaflet.marker([m.lat, m.lng], { ...m.options, icon })
      if (m.popup) {
        const popup = leaflet.DomUtil.create('div', 'popup')
        popup.innerHTML = m.popup
        marker.bindPopup(popup)
      }
      markersById.set(m.id, marker)
      markerCluster.addLayer(marker)
    }
    map.addLayer(markerCluster)
    activeCluster = markerCluster
    clusterReady.value = true
  }
  finally {
    clusterBuilding = false
  }
}

// Re-cluster when the locker set changes. Watch the array reference
// (not just length) so a same-length-different-contents update — e.g.
// a country switch that returns a fresh page — also triggers rebuild.
watch(
  () => props.lockers,
  () => {
    void ensureClusters()
  },
)

// Selection change: flip the icon on just the two affected markers
// instead of rebuilding 167 of them.
watch(
  () => props.selectedId,
  (newId, oldId) => {
    if (!iconNormal || !iconSelected) return
    if (oldId) {
      markersById.get(oldId)?.setIcon(iconNormal)
    }
    if (newId) {
      markersById.get(newId)?.setIcon(iconSelected)
    }
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
  geolocateError.value = null
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
    geolocateError.value = t('shipping.locker_picker.geolocate_denied')
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
      v-if="isLeafletReady"
      ref="mapRef"
      :zoom="zoom"
      :center="center"
      :use-global-leaflet="true"
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

    <!-- Geolocate error toast — surfaces denial / timeout instead
         of leaving the user with a button that "did nothing". -->
    <p
      v-if="geolocateError"
      role="alert"
      class="absolute right-3 top-16 z-[400] max-w-xs rounded bg-white/95 px-3 py-2 text-xs shadow-lg dark:bg-neutral-900/95"
    >
      {{ geolocateError }}
    </p>

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
