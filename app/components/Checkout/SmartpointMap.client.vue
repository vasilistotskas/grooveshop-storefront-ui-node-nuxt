<script lang="ts" setup>
import type { GeoJSONSource, Map as MapLibreMap, Marker, Popup } from 'maplibre-gl'

/**
 * The locker picker's map: every locker of the carrier's catalogue on
 * the platform basemap (`useMapLibre`), clustered.
 *
 * Clusters and lockers are HTML `<button>` markers over a clustered
 * GeoJSON source (MapLibre's HTML-cluster pattern), so each one is in
 * the tab order with an accessible name. Enter on a cluster zooms into
 * it; Enter on a locker opens its popup with focus on "Choose", which
 * emits the locker by `key` (the lockers of one ACS area share an `id`).
 *
 * Client-only (`.client.vue`) and lazy: MapLibre needs a browser, and
 * the picker mounts this only on its map tab, so checkout pays for the
 * library only when a shopper opens the map.
 */
const props = defineProps<{
  /** Bulk locker catalogue from ``carrier.fetchAll(country)``. */
  lockers: Locker[]
  /** ``true`` while the parent is fetching the catalogue. */
  loading?: boolean
}>()

const emit = defineEmits<{
  selected: [locker: Locker]
  /** The shopper asked for the list instead of the map. */
  showList: []
}>()

const LOCKER_SOURCE = 'lockers'
// A source draws nothing and loads no data without a layer reading it;
// this one is invisible: the markers are HTML.
const LOCKER_ANCHOR_LAYER = 'lockers-anchor'
const CLUSTER_MAX_ZOOM = 14
const CLUSTER_RADIUS = 60

const { t } = useI18n()

type PlacedLocker = Locker & { lat: number, lng: number }

const lockersWithCoords = computed(() =>
  props.lockers.filter(
    (l): l is PlacedLocker => typeof l.lat === 'number' && typeof l.lng === 'number',
  ),
)
const lockersByKey = computed(() => new Map(lockersWithCoords.value.map(l => [l.key, l])))
const bounds = computed(() => boundsOf(lockersWithCoords.value))

const container = useTemplateRef<HTMLElement>('container')

const { map, state } = useMapLibre(container, {
  mapOptions: () => ({
    bounds: bounds.value ?? undefined,
    fitBoundsOptions: { padding: 40, maxZoom: CLUSTER_MAX_ZOOM },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  }),
  carry: [LOCKER_SOURCE],
  onLoad: (instance, maplibre) => {
    instance.touchZoomRotate.disableRotation()
    instance.addControl(new maplibre.NavigationControl({ showCompass: false }))
    instance.addControl(new maplibre.GeolocateControl({
      positionOptions: { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
      fitBoundsOptions: { maxZoom: CLUSTER_MAX_ZOOM },
    }))
    instance.addSource(LOCKER_SOURCE, {
      type: 'geojson',
      data: lockerFeatures(),
      cluster: true,
      clusterRadius: CLUSTER_RADIUS,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
    })
    instance.addLayer({
      id: LOCKER_ANCHOR_LAYER,
      type: 'circle',
      source: LOCKER_SOURCE,
      paint: { 'circle-radius': 0, 'circle-opacity': 0 },
    })
    popup = new maplibre.Popup({ className: 'locker-popup', offset: 20, maxWidth: '18rem', focusAfterOpen: true })
    makeMarker = element => new maplibre.Marker({ element })
    instance.on('render', () => {
      if (instance.isSourceLoaded(LOCKER_SOURCE)) syncMarkers(instance)
    })
  },
})

function lockerFeatures() {
  return {
    type: 'FeatureCollection' as const,
    features: lockersWithCoords.value.map(locker => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [locker.lng, locker.lat] },
      properties: { key: locker.key },
    })),
  }
}

// Markers on screen, by `c<cluster id>` or `l<locker key>`.
const markers = new Map<string, Marker>()
let popup: Popup | null = null
let makeMarker: ((element: HTMLElement) => Marker) | null = null

const PIN_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18" aria-hidden="true"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>'

const MARKER_CLASS = 'flex items-center justify-center rounded-full bg-primary text-inverted ring-2 ring-(--ui-bg) shadow-md cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function clusterButton(instance: MapLibreMap, clusterId: number, count: number, lngLat: [number, number]): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${MARKER_CLASS} size-10 text-sm font-semibold`
  button.textContent = String(count)
  button.setAttribute('aria-label', t('shipping.locker_picker.cluster_aria_label', { count }))
  button.addEventListener('click', (event) => {
    // The map would read this click as a click on the map itself.
    event.stopPropagation()
    const source = instance.getSource<GeoJSONSource>(LOCKER_SOURCE)
    source?.getClusterExpansionZoom(clusterId).then((zoom) => {
      instance.easeTo({ center: lngLat, zoom })
      // The cluster's button is gone once the map zooms in; the canvas
      // keeps keyboard focus, where arrows pan and Tab reaches the
      // lockers it split into.
      instance.once('moveend', () => instance.getCanvas().focus())
    }).catch((error: unknown) => {
      log.warn({ tag: 'maps', message: 'cluster expansion failed', error })
    })
  })
  return button
}

function lockerButton(instance: MapLibreMap, locker: PlacedLocker): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  button.className = `${MARKER_CLASS} size-8`
  button.innerHTML = PIN_SVG
  button.setAttribute('aria-label', `${locker.name}, ${locker.addressLine1}, ${locker.postalCode} ${locker.city}`)
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    openPopup(instance, locker)
  })
  return button
}

function openPopup(instance: MapLibreMap, locker: PlacedLocker): void {
  if (!popup) return
  const content = document.createElement('div')
  content.className = 'flex flex-col gap-0.5 text-sm'
  const line = (text: string, className: string) => {
    const element = document.createElement('span')
    element.className = className
    element.textContent = text
    content.append(element)
  }
  line(locker.name, 'font-semibold text-highlighted')
  line(locker.addressLine1, 'text-toned')
  line(`${locker.postalCode} ${locker.city}`, 'text-xs text-toned')
  if (locker.workingHours) line(locker.workingHours, 'mt-1 text-xs text-muted')
  const choose = document.createElement('button')
  choose.type = 'button'
  choose.className = 'mt-2 w-full cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-semibold text-inverted hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'
  choose.textContent = t('shipping.locker_picker.choose', { carrier: '' }).trim()
  // By key: the lockers of one ACS area share their `id`.
  choose.addEventListener('click', () => {
    const picked = lockersByKey.value.get(locker.key)
    if (picked) emit('selected', picked)
  })
  content.append(choose)
  popup.setLngLat([locker.lng, locker.lat]).setDOMContent(content).addTo(instance)
}

function syncMarkers(instance: MapLibreMap): void {
  if (!makeMarker) return
  const seen = new Set<string>()
  for (const feature of instance.querySourceFeatures(LOCKER_SOURCE)) {
    if (feature.geometry.type !== 'Point') continue
    const [lng, lat] = feature.geometry.coordinates
    if (typeof lng !== 'number' || typeof lat !== 'number') continue
    const properties = feature.properties
    let id: string
    let build: () => HTMLElement
    if (properties.cluster) {
      const clusterId = Number(properties.cluster_id)
      const count = Number(properties.point_count)
      id = `c${clusterId}`
      build = () => clusterButton(instance, clusterId, count, [lng, lat])
    }
    else {
      const locker = lockersByKey.value.get(String(properties.key))
      if (!locker) continue
      id = `l${locker.key}`
      build = () => lockerButton(instance, locker)
    }
    // A feature can sit in two tiles at once; one marker each.
    if (seen.has(id)) continue
    seen.add(id)
    if (markers.has(id)) continue
    markers.set(id, makeMarker(build()).setLngLat([lng, lat]).addTo(instance))
  }
  for (const [id, marker] of markers) {
    if (seen.has(id)) continue
    marker.remove()
    markers.delete(id)
  }
}

function clearMarkers(): void {
  for (const marker of markers.values()) marker.remove()
  markers.clear()
}

// A new catalogue (another country, a refresh) replaces the data and
// the camera; the markers rebuild from the new clusters.
watch(lockersWithCoords, () => {
  const instance = map.value
  if (!instance || state.value !== 'ready') return
  popup?.remove()
  clearMarkers()
  instance.getSource<GeoJSONSource>(LOCKER_SOURCE)?.setData(lockerFeatures())
  if (bounds.value) instance.fitBounds(bounds.value, { padding: 40, maxZoom: CLUSTER_MAX_ZOOM })
})
</script>

<template>
  <div class="relative size-full">
    <div
      v-if="state === 'unavailable'"
      role="status"
      class="flex size-full flex-col items-center justify-center gap-3 p-4 text-center"
    >
      <UIcon name="i-lucide-map-pin-off" class="size-10 text-muted" />
      <p class="text-sm font-medium text-toned">
        {{ t('shipping.locker_picker.map_unavailable') }}
      </p>
      <UButton
        color="neutral"
        variant="outline"
        icon="i-lucide-list"
        :label="t('shipping.locker_picker.show_list')"
        @click="() => emit('showList')"
      />
    </div>

    <USkeleton v-else-if="loading" class="size-full" />

    <div
      v-else-if="lockersWithCoords.length === 0"
      role="status"
      class="flex size-full flex-col items-center justify-center gap-2 p-4 text-center"
    >
      <UIcon name="i-lucide-map-pin-off" class="size-10 text-muted" />
      <p class="text-sm font-medium text-toned">
        {{ t('shipping.locker_picker.no_results_in_area') }}
      </p>
    </div>

    <template v-else>
      <!-- First in the tab order: the same lockers as a list, for a
           shopper who would rather not use the map. -->
      <UButton
        class="
          sr-only
          focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2
          focus-visible:left-2 focus-visible:z-10
        "
        color="neutral"
        variant="solid"
        size="sm"
        icon="i-lucide-list"
        :label="t('shipping.locker_picker.show_list')"
        @click="() => emit('showList')"
      />
      <div ref="container" class="size-full" />
    </template>
  </div>
</template>

<style>
.locker-popup .maplibregl-popup-content {
  background: var(--ui-bg);
  color: var(--ui-text);
  border-radius: var(--ui-radius);
  box-shadow: 0 4px 16px rgb(0 0 0 / 0.2);
}

.locker-popup .maplibregl-popup-tip {
  display: none;
}

.locker-popup .maplibregl-popup-close-button {
  color: var(--ui-text-muted);
}
</style>
