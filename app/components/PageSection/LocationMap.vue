<script lang="ts" setup>
/**
 * Where the shop is.
 *
 * Two ways to draw it, in order of preference for the operator:
 *
 * - `lat`/`lng`, which render on our own OpenStreetMap canvas. Nothing
 *   to configure: the tile origins are in every tenant's `img-src`.
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
 * back watermarked, so the canvas is treated the same as a missing
 * `lat`/`lng`: falls through to the address line, or renders nothing.
 *
 * The canvas loads when the visitor asks for it, not on arrival. It is
 * third-party tiles and Leaflet's own controls, and the tiles overhang
 * the frame (clipped, but still boxes in the page's stacking order), so
 * a checker cannot tell what the text above the map is painted on.
 */
const props = defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  embedUrl?: string
  lat?: number
  lng?: number
  address?: string
  surface?: 'default' | 'muted'
}>()

const { t } = useI18n()
const runtimeConfig = useRuntimeConfig()

const mapRequested = ref(false)

const showEmbed = computed(() => Boolean(props.embedUrl))

/** Leaflet only needs a point; `0` is a valid coordinate, so test the type. */
const showCanvas = computed(
  () => !showEmbed.value
    && typeof props.lat === 'number'
    && typeof props.lng === 'number'
    && Boolean(runtimeConfig.public.cartoBasemapsKey),
)
</script>

<template>
  <PageSectionBand
    v-if="showEmbed || showCanvas || address"
    :heading="title"
    :surface="surface"
  >
    <div
      v-if="showEmbed"
      class="overflow-hidden rounded-xl ring ring-default"
    >
      <iframe
        :src="embedUrl"
        :title="t('title')"
        class="h-96 w-full border-0"
        loading="lazy"
        referrerpolicy="no-referrer-when-downgrade"
        allowfullscreen
      />
    </div>
    <!-- Leaflet touches `window` on import, so the canvas is client-only
         and lazy — the same shape the locker picker uses — and it mounts
         only once the visitor has asked for the map. The placeholder
         holds the band's height, and so does the fallback. -->
    <div
      v-else-if="showCanvas && !mapRequested"
      class="
        flex h-80 items-center justify-center rounded-xl bg-muted ring
        ring-default
        md:h-96
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
    <ClientOnly v-else-if="showCanvas">
      <LazyPageSectionLocationCanvas
        :lat="lat!"
        :lng="lng!"
        :address="address"
      />
      <template #fallback>
        <USkeleton class="h-80 w-full rounded-xl md:h-96" />
      </template>
    </ClientOnly>
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
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  title: Τοποθεσία καταστήματος
  show_map: Εμφάνιση χάρτη
en:
  title: Store location
  show_map: Show map
</i18n>
