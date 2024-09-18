<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const config = useRuntimeConfig()
const { isMobileOrTablet } = useDevice()

const appTitle = computed(() => config.public.appTitle as string)

const items = computed(() => [
  isMobileOrTablet ? '/img/main-banner-mobile.png' : '/img/main-banner.png',
])

const bannerWidth = ref(isMobileOrTablet ? 510 : 1194)
const bannerHeight = ref(isMobileOrTablet ? 638 : 418)
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
                :alt="appTitle"
                :src="item"
                :style="{ objectFit: 'contain' }"
                :height="bannerHeight"
                :width="bannerWidth"
                sizes="xs:382px sm:352px md:545px lg:1194px xl:1194px xxl:1194px 2xl:1194px"
                fit="cover"
                quality="100"
                class="rounded-lg"
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
