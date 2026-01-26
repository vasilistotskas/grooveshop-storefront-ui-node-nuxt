<script lang="ts" setup>
const config = useRuntimeConfig()
const { isMobileOrTablet } = useDevice()
const { t } = useI18n()

const appTitle = computed(() => config.public.appTitle as string)

const items = computed(() => [
  isMobileOrTablet ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])

const bannerWidth = computed(() => isMobileOrTablet ? 510 : 1194)
const bannerHeight = computed(() => isMobileOrTablet ? 638 : 418)

definePageMeta({
  layout: 'default',
})

const lcpImageUrl = computed(() =>
  isMobileOrTablet
    ? '/_ipx/f_avif&q_80&fit_cover&s_510x638/img/main-banner-mobile.png'
    : '/_ipx/f_avif&q_80&fit_cover&s_1194x418/img/main-banner.png',
)

useHead({
  titleTemplate: '%s',
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: lcpImageUrl,
      fetchpriority: 'high',
      type: 'image/avif',
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
          :ui="{ item: `basis-full place-items-center justify-center` }"
          :aria-label="t('carousel.banner')"
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

<i18n lang="yaml">
el:
  carousel:
    banner: Κύριο banner
</i18n>
