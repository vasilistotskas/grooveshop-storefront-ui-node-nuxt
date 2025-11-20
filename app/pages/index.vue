<script lang="ts" setup>
const config = useRuntimeConfig()
const { isMobileOrTablet } = useDevice()

const appTitle = computed(() => config.public.appTitle as string)

const items = computed(() => [
  isMobileOrTablet ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])

const bannerWidth = ref(isMobileOrTablet ? 510 : 1194)
const bannerHeight = ref(isMobileOrTablet ? 638 : 418)

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

        <BlogPostsList
          :page-size="6"
          :show-ordering="false"
          class="
            mx-auto max-w-(--container-main)
            md:!p-0
          "
          pagination-type="cursor"
        />
      </div>
    </section>
  </PageWrapper>
</template>
