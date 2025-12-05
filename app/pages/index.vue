<script lang="ts" setup>
const config = useRuntimeConfig()
const { isMobileOrTablet } = useDevice()

const appTitle = computed(() => config.public.appTitle as string)

const items = computed(() => [
  isMobileOrTablet ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])

const bannerWidth = ref(isMobileOrTablet ? 510 : 1194)
const bannerHeight = ref(isMobileOrTablet ? 638 : 418)

// Responsive sizes for banner image
const bannerSizes = computed(() =>
  isMobileOrTablet
    ? 'xs:510px sm:510px md:510px'
    : 'lg:1194px xl:1194px 2xl:1194px',
)

// Precompute LCP image URL for preloading
const lcpImageUrl = computed(() =>
  isMobileOrTablet
    ? '/_ipx/f_webp&q_80&fit_cover&s_510x638/img/main-banner-mobile.png'
    : '/_ipx/f_webp&q_80&fit_cover&s_1194x418/img/main-banner.png',
)

definePageMeta({
  layout: 'default',
})

useHead({
  titleTemplate: '%s',
  link: [
    // Preload LCP image for faster Largest Contentful Paint
    {
      rel: 'preload',
      as: 'image',
      href: lcpImageUrl.value,
      fetchpriority: 'high',
    },
  ],
})

useSeoMeta({
  titleTemplate: '%s',
})
</script>

<template>
  <PageWrapper>
    <section
      :class="{
        'grid': isMobileOrTablet,
        'flex': !isMobileOrTablet,
        'flex-col': !isMobileOrTablet,
      }"
      class="
        gap-4 pt-4
        md:gap-8
      "
    >
      <div
        class="
          grid gap-4
          md:gap-8
        "
      >
        <MobileOrTabletOnly>
          <BlogCategoriesSlider
            class="mx-auto max-w-(--container-main) !py-0"
          />
        </MobileOrTabletOnly>

        <DesktopOnly>
          <BlogCategoriesSlider
            class="
              mx-auto max-w-(--container-main)
              md:!p-0
            "
          />
        </DesktopOnly>

        <UCarousel
          v-slot="{ item }"
          :items="items"
          :ui="{ item: `
            basis-full items-center justify-center justify-items-center
          ` }"
          class="
            mx-auto max-w-(--container-main)
            md:!p-0
          "
          indicators
        >
          <NuxtImg
            v-if="item"
            :alt="appTitle"
            :src="item"
            :style="{ objectFit: 'contain' }"
            :height="bannerHeight"
            :width="bannerWidth"
            :sizes="bannerSizes"
            fit="cover"
            quality="80"
            class="rounded-lg"
            format="webp"
            loading="eager"
            fetch-priority="high"
            fetchpriority="high"
            preload
          />
        </UCarousel>

        <LazyBlogPostsList
          :page-size="6"
          :show-ordering="false"
          class="
            mx-auto max-w-(--container-main)
            md:!p-0
          "
          pagination-type="cursor"
          hydrate-on-visible
        />
      </div>
    </section>
  </PageWrapper>
</template>
