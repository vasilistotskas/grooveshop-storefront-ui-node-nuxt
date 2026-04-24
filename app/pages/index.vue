<script lang="ts" setup>
const config = useRuntimeConfig()
const { isMobileOrTablet } = useDevice()
const { t } = useI18n()
const tenantStore = useTenantStore()

const appTitle = computed(() => tenantStore.storeName || (config.public.appTitle as string))

const items = computed(() => [
  isMobileOrTablet.value ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])

const bannerWidth = computed(() => isMobileOrTablet.value ? 510 : 1194)
const bannerHeight = computed(() => isMobileOrTablet.value ? 638 : 418)

definePageMeta({
  layout: 'default',
})

useHead({
  titleTemplate: '%s',
})

useSeoMeta({
  titleTemplate: '%s',
})
</script>

<template>
  <PageWrapper>
    <section
      class="
        grid gap-4 pt-4
        md:flex md:flex-col md:gap-8
      "
    >
      <div
        class="
          grid gap-4
          md:gap-8
        "
      >
        <BlogCategoriesSlider
          :class="[
            'mx-auto max-w-main',
            isMobileOrTablet ? 'py-0!' : 'md:p-0!',
          ]"
        />

        <UCarousel
          v-slot="{ item }"
          :items="items"
          :ui="{ item: `basis-full place-items-center justify-center` }"
          :aria-label="t('carousel.banner')"
          class="
            mx-auto max-w-main
            md:!p-0
          "
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

        <!-- Recently viewed rail: rendered client-side from localStorage
             so returning visitors land on products they were eyeing.
             Hidden when history is empty.

             Uses the non-lazy variant — ``<LazyProductRecentlyViewed
             hydrate-on-visible>`` combined with the component's inner
             ``<ClientOnly>`` deadlocks: SSR renders nothing (fallback),
             ``hydrate-on-visible`` has no DOM node to observe, and
             hydration never fires. Plain render ships the component's
             setup on every client load so ``useRecentlyViewed`` can
             read localStorage and populate the carousel. -->
        <ProductRecentlyViewed
          class="
            mx-auto w-full max-w-main
            md:p-0!
          "
        />

        <LazyBlogPostsList
          :page-size="6"
          :show-ordering="false"
          class="
            mx-auto max-w-main
            md:p-0!
          "
          pagination-type="cursor"
          hydrate-on-visible
        />
      </div>
    </section>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  carousel:
    banner: Κύριο banner
</i18n>
