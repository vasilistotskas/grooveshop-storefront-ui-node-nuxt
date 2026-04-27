<script lang="ts" setup>
const config = useRuntimeConfig()
const siteConfig = useSiteConfig()
const { isMobileOrTablet } = useDevice()
const { t } = useI18n()
const route = useRoute()

const appTitle = computed(() => config.public.appTitle as string)

const items = computed(() => [
  isMobileOrTablet.value ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])

const bannerWidth = computed(() => isMobileOrTablet.value ? 510 : 1194)
const bannerHeight = computed(() => isMobileOrTablet.value ? 638 : 418)

// Admin-toggleable rail — extra-setting RECENTLY_VIEWED_ENABLED.
// Fetched during SSR with a stale-falls-open fallback so a flaky
// settings call never silently kills a user-facing rail. Default is
// ``true`` on the Django side, so legacy behaviour is preserved.
const headers = useRequestHeaders(['cookie'])
const { data: recentlyViewedSetting } = await useAsyncData(
  'home:recently-viewed-enabled',
  () => $fetch<{ value?: string }>('/api/settings/get', {
    query: { key: 'RECENTLY_VIEWED_ENABLED' },
    headers,
  }).catch(() => ({ value: 'True' })),
)
const recentlyViewedEnabled = computed(() => {
  const raw = (recentlyViewedSetting.value?.value ?? 'true').toString().toLowerCase()
  return raw === 'true' || raw === '1' || raw === 'yes'
})

definePageMeta({
  layout: 'default',
})

useHead({
  titleTemplate: '%s',
})

useSeoMeta({
  titleTemplate: '%s',
  title: () => appTitle.value,
  description: () => siteConfig.description,
  ogTitle: () => appTitle.value,
  ogDescription: () => siteConfig.description,
  ogUrl: `${config.public.baseUrl}${route.path}`,
  ogType: 'website',
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
            md:p-0!
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
             read localStorage and populate the carousel.

             Outer v-if gates on the admin-controlled
             RECENTLY_VIEWED_ENABLED extra-setting; toggling it off in
             the Django admin removes the rail without a deploy. -->
        <ProductRecentlyViewed
          v-if="recentlyViewedEnabled"
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
