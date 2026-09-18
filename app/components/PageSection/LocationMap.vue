<script lang="ts" setup>
/**
 * Where the shop is.
 *
 * Only https embeds survive the props schema, and the tenant must also
 * carry the embed origin (e.g. `https://www.google.com`) in
 * `allowed_csp_sources` or the browser blocks the frame — `3.csp.ts`
 * extends `frame-src` from that field.
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

const showMap = computed(() => Boolean(props.embedUrl))
</script>

<template>
  <PageSectionBand
    v-if="showMap || address"
    :heading="title"
    :surface="surface"
  >
    <div
      v-if="showMap"
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
en:
  title: Store location
</i18n>
