<script lang="ts" setup>
/**
 * Where the shop is.
 *
 * Two ways to draw it, in order of preference for the operator:
 *
 * - the store's own location (`STORE_GEO_LAT`/`STORE_GEO_LNG`,
 *   `useStoreLocation`), on our own OpenStreetMap canvas. Nothing to
 *   configure: the tile origins are in every tenant's `img-src`. The
 *   band used to carry its own coordinates, which drifted from the
 *   location the store's structured data reports.
 * - `embed_url`, for a store that wants a specific provider's map.
 *   Only https embeds survive the props schema, and the tenant must
 *   also carry the embed origin (e.g. `https://www.google.com`) in
 *   `allowed_csp_sources` or the browser blocks the frame — `3.csp.ts`
 *   extends `frame-src` from that field.
 *
 * With neither, the band is one line of address, so it does not render
 * at all unless the operator asked for the address on its own. The
 * canvas also needs the platform's `cartoBasemapsKey`
 * (`shared/utils/carto-basemaps.ts`) — without one, CARTO's tiles come
 * back watermarked, so the canvas is treated the same as a store with no
 * location: falls through to the address line, or renders nothing.
 *
 * The canvas loads when the visitor asks for it, not on arrival. It is
 * third-party tiles and Leaflet's own controls, and the tiles overhang
 * the frame (clipped, but still boxes in the page's stacking order), so
 * a checker cannot tell what the text above the map is painted on.
 *
 * Beside the address, the place opens in Google Maps or Apple Maps
 * (`mapLinks`): the visitor's own app is where the directions are.
 */
const props = defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  embedUrl?: string
  address?: string
  surface?: 'default' | 'muted'
}>()

const { t } = useStoreI18n('components/PageSection/LocationMap')
const runtimeConfig = useRuntimeConfig()
const tenantStore = useTenantStore()
const location = useStoreLocation()

const mapRequested = ref(false)

const links = computed(() => mapLinks({
  lat: location.value?.lat,
  lng: location.value?.lng,
  address: props.address,
  name: tenantStore.storeName || undefined,
}))

const showEmbed = computed(() => Boolean(props.embedUrl))

const showCanvas = computed(
  () => !showEmbed.value
    && location.value !== undefined
    && Boolean(runtimeConfig.public.cartoBasemapsKey),
)
</script>

<template>
  <PageSectionBand
    v-if="showEmbed || showCanvas || address || links"
    :heading="title"
    :surface="surface"
    padding="sm"
  >
    <div
      v-if="showEmbed"
      class="h-64 overflow-hidden rounded-xl ring ring-default md:h-72"
    >
      <iframe
        :src="embedUrl"
        :title="t('title')"
        class="size-full border-0"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      />
    </div>
    <!-- Leaflet touches `window` on import, so the canvas is client-only
         and lazy — the same shape the locker picker uses — and it mounts
         only once the visitor has asked for the map. One frame holds the
         placeholder, the skeleton and the map, so the band keeps its
         height when the map opens. -->
    <div
      v-else-if="showCanvas"
      class="h-64 md:h-72"
    >
      <div
        v-if="!mapRequested"
        class="
          flex size-full items-center justify-center rounded-xl bg-default ring
          ring-default
        "
      >
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-map-pin"
          :label="t('show_map')"
          @click="() => { mapRequested = true }"
        />
      </div>
      <ClientOnly v-else>
        <LazyPageSectionLocationCanvas
          v-if="location"
          :lat="location.lat"
          :lng="location.lng"
          :address="address"
        />
        <template #fallback>
          <USkeleton class="size-full rounded-xl" />
        </template>
      </ClientOnly>
    </div>
    <div
      v-if="address || links"
      class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3"
    >
      <p
        v-if="address"
        class="flex items-center gap-2 text-muted"
      >
        <UIcon
          name="i-heroicons-map-pin"
          class="size-5 shrink-0 text-secondary"
        />
        {{ address }}
      </p>
      <ul
        v-if="links"
        class="flex flex-wrap gap-2"
        :aria-label="t('open_in')"
      >
        <li>
          <UButton
            :to="links.google"
            target="_blank"
            color="neutral"
            variant="outline"
            icon="i-mdi-google-maps"
            trailing-icon="i-heroicons-arrow-up-right-20-solid"
          >
            {{ t('google_maps') }}<span class="sr-only"> ({{ t('new_tab') }})</span>
          </UButton>
        </li>
        <li>
          <UButton
            :to="links.apple"
            target="_blank"
            color="neutral"
            variant="outline"
            icon="i-mdi-apple"
            trailing-icon="i-heroicons-arrow-up-right-20-solid"
          >
            {{ t('apple_maps') }}<span class="sr-only"> ({{ t('new_tab') }})</span>
          </UButton>
        </li>
      </ul>
    </div>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  title: Τοποθεσία καταστήματος
  show_map: Εμφάνιση χάρτη
  open_in: Άνοιγμα στους χάρτες
  google_maps: Google Maps
  apple_maps: Apple Maps
  new_tab: ανοίγει σε νέα καρτέλα
en:
  title: Store location
  show_map: Show map
  open_in: Open in maps
  google_maps: Google Maps
  apple_maps: Apple Maps
  new_tab: opens in a new tab
</i18n>
