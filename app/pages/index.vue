<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const { isMobileOrTablet } = useDevice()

const items = computed(() => [
  isMobileOrTablet ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])

const bannerHeight = ref(isMobileOrTablet ? 2363 : 672)
const bannerWidth = ref(isMobileOrTablet ? 1890 : 1920)
</script>

<template>
  <PageWrapper class="container-fluid !p-0">
    <PageBody>
      <PageSection>
        <div
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
                class="container-sm !pr-0"
              />
            </MobileOrTabletOnly>

            <DesktopOnly>
              <BlogCategoriesSlider
                class="
                  container-sm

                  md:!p-0
                "
              />
            </DesktopOnly>

            <UCarousel
              v-slot="{ item }"
              :items="items"
              :ui="{ item: 'basis-full items-center justify-center justify-items-center' }"
              class="
                container-sm mx-auto

                md:!p-0
              "
              indicators
            >
              <NuxtImg
                :alt="'website.gr'"
                :height="bannerHeight"
                :src="item"
                :style="{ objectFit: 'contain' }"
                :width="bannerWidth"
                class="rounded-lg"
                densities="x1"
                format="webp"
                loading="eager"
                preload
              />
            </UCarousel>

            <BlogPostsList
              :page-size="6"
              :show-ordering="false"
              class="
                container-sm

                md:!p-0
              "
              pagination-type="cursor"
            />
          </div>
        </div>
      </PageSection>
    </PageBody>
  </PageWrapper>
</template>
