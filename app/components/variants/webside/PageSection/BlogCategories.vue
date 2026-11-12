<script lang="ts" setup>
/**
 * The blog's categories as webside's slider. The categories arrive read
 * (`categories`, a data setting the page route resolved).
 *
 * With a title, a sub-line or a call to action set, the slider sits in the
 * platform's band, which draws them; with none it is the bare slider webside
 * has always drawn. The `tiles` layout is the platform's own band
 * (`PageSection/BlogCategoryTiles`), drawn in webside's theme: the design
 * keeps only its slider.
 */
const props = defineProps<{
  title?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  layout?: 'slider' | 'tiles'
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
}>()

const { isMobileOrTablet } = useDevice()
const linkTo = useLinkTo()

/** Whether the band has anything of its own to draw around the slider: the band draws a call to action only with its link. */
const banded = computed(() => !!(props.title || props.subheading || (props.ctaText && props.ctaLink)))

const sliderClass = computed(() => [
  'w-full',
  isMobileOrTablet.value ? 'py-0!' : 'md:p-0!',
])
</script>

<template>
  <PageSectionBlogCategoryTiles
    v-if="layout === 'tiles'"
    :title="title"
    :subheading="subheading"
    :cta-text="ctaText"
    :cta-link="ctaLink"
    :categories="categories"
  />
  <PageSectionBand
    v-else-if="categories.items.length && banded"
    :heading="title"
    :subheading="subheading"
    :cta-text="ctaText"
    :cta-link="ctaLink ? linkTo(ctaLink) : undefined"
    padding="sm"
  >
    <WebsideBlogCategoriesSlider
      :categories="[...categories.items]"
      :class="sliderClass"
    />
  </PageSectionBand>
  <WebsideBlogCategoriesSlider
    v-else-if="categories.items.length"
    :categories="[...categories.items]"
    :class="sliderClass"
  />
</template>
