<script lang="ts" setup>
/**
 * The store's own pin on an OpenStreetMap canvas.
 *
 * The `location_map` section has always accepted `lat`/`lng` — the demo
 * seeder fills them from `STORE_GEO_LAT`/`STORE_GEO_LNG` — but only an
 * `embed_url` ever rendered anything, so a store that gave coordinates
 * got a full band holding one line of address. Coordinates are the
 * cheaper thing for an operator to supply *and* the safer one: the
 * embed path needs the provider's origin in the tenant's
 * `allowed_csp_sources`, while these tiles are already in every
 * tenant's `img-src` (`shared/utils/csp.ts`).
 *
 * Client-only because Leaflet touches `window` on import; the caller
 * hydrates it on visibility so the contact page does not pay for the
 * library above the fold.
 */
const props = defineProps<{
  lat: number
  lng: number
  /** Shown in a permanent tooltip on the pin, when the section has one. */
  address?: string
}>()

const colorMode = useColorMode()

/**
 * Same CARTO basemaps the locker picker uses — no API key, attribution
 * baked in, and one pair per colour scheme so the map does not glare
 * out of a dark page.
 */
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const
const ATTRIBUTION
  = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

const tileUrl = computed(() =>
  colorMode.value === 'dark' ? TILES.dark : TILES.light,
)

const center = computed<[number, number]>(() => [props.lat, props.lng])
</script>

<template>
  <div class="h-80 overflow-hidden rounded-xl ring ring-default md:h-96">
    <LMap
      :zoom="15"
      :center="center"
      :use-global-leaflet="false"
      class="size-full"
      :options="{
        // A section map inside a scrolling page must not swallow the
        // wheel — the visitor is scrolling past it, not exploring it.
        // Dragging and the zoom buttons stay, so it is still a map.
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      }"
    >
      <LTileLayer
        :url="tileUrl"
        :attribution="ATTRIBUTION"
        :options="{ maxZoom: 19, subdomains: 'abcd' }"
        layer-type="base"
      />
      <LCircleMarker
        :lat-lng="center"
        :radius="10"
        :options="{
          weight: 3,
          fillOpacity: 1,
          // The accent comes from CSS, not from an option: Leaflet
          // writes its colours into SVG PRESENTATION ATTRIBUTES, which
          // do not run var() substitution, so a token passed here would
          // paint nothing.
          className: 'location-pin',
        }"
      >
        <LTooltip
          v-if="address"
          :options="{ permanent: true, direction: 'top', offset: [0, -12] }"
        >
          {{ address }}
        </LTooltip>
      </LCircleMarker>
    </LMap>
  </div>
</template>

<style scoped>
/* Leaflet builds the SVG itself, so the scope attribute never lands on
   the circle — :deep() is what reaches it. */
:deep(.location-pin) {
  fill: var(--ui-secondary);
  stroke: #fff;
}
</style>
