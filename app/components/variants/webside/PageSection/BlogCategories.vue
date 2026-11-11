<script lang="ts" setup>
/**
 * The blog's categories as webside's slider. The categories arrive read
 * (`categories`, a data setting the page route resolved).
 *
 * The `tiles` layout is the platform's own band (`PageSection/BlogCategoryTiles`),
 * drawn in webside's theme: the design keeps only its slider.
 */
defineProps<{
  title?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  layout?: 'slider' | 'tiles'
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
}>()

const { isMobileOrTablet } = useDevice()
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
  <WebsideBlogCategoriesSlider
    v-else-if="categories.items.length"
    :categories="[...categories.items]"
    :class="[
      'w-full',
      isMobileOrTablet ? 'py-0!' : 'md:p-0!',
    ]"
  />
</template>
