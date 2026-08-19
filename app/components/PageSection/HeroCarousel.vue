<script lang="ts" setup>
const props = defineProps<{
  title?: string
  images?: string[]
  /** Mobile/tablet variants (matching indices); falls back to `images`. */
  mobileImages?: string[]
  /** Optional deep-link the banner navigates to (validated internal path or https URL). */
  link?: string
}>()

const { isMobileOrTablet } = useDevice()
const { t } = useI18n()

const config = useRuntimeConfig()
const tenantStore = useTenantStore()
const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

// Banner artwork is tenant DATA (layout section props) — there is
// deliberately no built-in default image: a hardcoded fallback here
// would put one store's promo on every tenant whose layout carries a
// prop-less hero_carousel. Empty props render nothing.
const items = computed(() => {
  if (isMobileOrTablet.value && props.mobileImages?.length) {
    return props.mobileImages
  }
  return props.images ?? []
})

const bannerWidth = computed(() => isMobileOrTablet.value ? 510 : 1194)
const bannerHeight = computed(() => isMobileOrTablet.value ? 638 : 418)
</script>

<template>
  <UCarousel
    v-if="items.length"
    v-slot="{ item }"
    :items="items"
    :ui="{ item: 'basis-full place-items-center justify-center' }"
    :aria-label="t('carousel.banner')"
    class="
      mx-auto max-w-main
      md:p-0!
    "
    indicators
  >
    <NuxtLink
      v-if="item && link"
      :to="link"
      :aria-label="t('carousel.bannerLink')"
      class="block"
    >
      <NuxtImg
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
        :preload="{ fetchPriority: 'high' }"
      />
    </NuxtLink>
    <NuxtImg
      v-else-if="item"
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
      :preload="{ fetchPriority: 'high' }"
    />
  </UCarousel>
</template>

<i18n lang="yaml">
el:
  carousel:
    banner: Κύριο banner
    bannerLink: Άνοιγμα συνδέσμου banner
</i18n>
