<script lang="ts" setup>
definePageMeta({
  layout: 'default',
})

const { isMobileOrTablet } = useDevice()

const items = [
  '/img/main-banner.png',
]
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
          <MobileOrTabletOnly>
            <BlogCategoriesSlider
              class="container-sm !pr-0"
            />
          </MobileOrTabletOnly>

          <DesktopOnly>
            <div
              class="
                grid gap-4

                md:gap-8
              "
            >
              <BlogCategoriesSlider
                class="
                  container-sm

                  md:!p-0
                "
              />
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
                  :height="418"
                  :src="item"
                  :style="{ objectFit: 'contain' }"
                  :width="1194"
                  class="rounded-lg"
                  densities="x1"
                  format="webp"
                  loading="eager"
                  preload
                />
              </UCarousel>
            </div>
          </DesktopOnly>

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
      </PageSection>
    </PageBody>
  </PageWrapper>
</template>
