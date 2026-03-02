<script lang="ts" setup>
const { isMobileOrTablet } = useDevice()

const { sections, status } = usePageConfig('home')

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

        <template v-if="status !== 'pending'">
          <PageSectionRenderer
            v-for="section in sections"
            :key="section.uuid || section.id"
            :section="section"
          />
        </template>
      </div>
    </section>
  </PageWrapper>
</template>
