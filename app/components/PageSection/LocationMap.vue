<script lang="ts" setup>
const props = defineProps<{
  embedUrl?: string
  lat?: number
  lng?: number
  address?: string
}>()

const { t } = useI18n()

// Only https embeds survive the props schema; the tenant must also
// carry the embed origin (e.g. https://www.google.com) in
// allowed_csp_sources or the browser blocks the frame (3.csp.ts
// extends frame-src from that field).
const showMap = computed(() => Boolean(props.embedUrl))
</script>

<template>
  <section
    v-if="showMap || address"
    :aria-label="t('title')"
    class="w-full"
  >
    <div
      v-if="showMap"
      class="overflow-hidden rounded-lg"
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
      class="
        mt-3 flex items-center gap-2 text-neutral-600
        dark:text-neutral-300
      "
    >
      <UIcon
        name="i-heroicons-map-pin"
        class="size-5 shrink-0"
      />
      {{ address }}
    </p>
  </section>
</template>

<i18n lang="yaml">
el:
  title: Τοποθεσία καταστήματος
</i18n>
