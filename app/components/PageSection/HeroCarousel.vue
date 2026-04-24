<script lang="ts" setup>
defineProps<{
  title?: string
  images?: string[]
}>()

const { isMobileOrTablet } = useDevice()

const config = useRuntimeConfig()
const tenantStore = useTenantStore()
const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

const defaultItems = [
  isMobileOrTablet ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
]

const bannerWidth = isMobileOrTablet ? 510 : 1194
const bannerHeight = isMobileOrTablet ? 638 : 418
</script>

<template>
  <UCarousel
    v-slot="{ item }"
    :items="images?.length ? images : defaultItems"
    :ui="{ item: 'basis-full place-items-center justify-center' }"
    class="mx-auto max-w-(--container-main) md:!p-0"
    indicators
  >
    <NuxtImg
      v-if="item"
      :alt="appTitle"
      :src="item"
      :height="bannerHeight"
      :width="bannerWidth"
      densities="x1"
      fit="cover"
      quality="80"
      class="rounded-lg"
      style="object-fit: contain; content-visibility: auto;"
      loading="eager"
      fetchpriority="high"
      decoding="async"
      preload
    />
  </UCarousel>
</template>
