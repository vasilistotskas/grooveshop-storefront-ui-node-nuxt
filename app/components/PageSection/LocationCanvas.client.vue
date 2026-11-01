<script lang="ts" setup>
/**
 * The store's own pin on the platform basemap (`useMapLibre`).
 *
 * The `location_map` band draws it from the store's own location
 * (`STORE_GEO_LAT`/`STORE_GEO_LNG`, `useStoreLocation`), the one its
 * structured data reports too, so there is nothing to configure per
 * store: the tiles come from the platform maps host and the glyphs from
 * the store's own host.
 *
 * Client-only (`.client.vue`): MapLibre needs a browser, and the band
 * mounts this only once the visitor asks for the map, so a page with the
 * band pays for the library only then. Cooperative gestures: a map in a
 * scrolling page must not swallow the wheel or a one-finger swipe — the
 * visitor is scrolling past it, not exploring it.
 */
const props = defineProps<{
  lat: number
  lng: number
  /** Shown beside the pin, when the section has one. */
  address?: string
}>()

const { t } = useI18n()
const container = useTemplateRef<HTMLElement>('container')

const { state } = useMapLibre(container, {
  mapOptions: () => ({
    center: [props.lng, props.lat],
    zoom: 15,
    cooperativeGestures: true,
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
  }),
  onLoad: (instance, maplibre) => {
    instance.touchZoomRotate.disableRotation()
    instance.addControl(new maplibre.NavigationControl({ showCompass: false }))
    const pin = document.createElement('div')
    pin.className = 'flex flex-col items-center gap-1'
    if (props.address) {
      const label = document.createElement('span')
      label.className = 'max-w-56 rounded-md bg-default px-2 py-1 text-center text-xs font-medium text-highlighted shadow-md'
      label.textContent = props.address
      pin.append(label)
    }
    const dot = document.createElement('span')
    dot.className = 'size-5 rounded-full bg-secondary ring-3 ring-(--ui-bg) shadow-md'
    dot.setAttribute('aria-hidden', 'true')
    pin.append(dot)
    new maplibre.Marker({ element: pin, anchor: 'bottom' })
      .setLngLat([props.lng, props.lat])
      .addTo(instance)
  },
})
</script>

<template>
  <div class="size-full overflow-hidden rounded-xl ring ring-default">
    <div
      v-if="state === 'unavailable'"
      role="status"
      class="flex size-full items-center justify-center gap-2 p-4 text-center text-sm text-muted"
    >
      <UIcon name="i-heroicons-map-pin" class="size-5 shrink-0" />
      <span>{{ t('maps.unavailable') }}</span>
    </div>
    <div v-else ref="container" class="size-full" />
  </div>
</template>
