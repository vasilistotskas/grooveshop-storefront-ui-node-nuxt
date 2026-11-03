<script lang="ts" setup>
/**
 * The blog's categories as webside's slider. The categories arrive read
 * (`categories`, a data setting the page route resolved).
 */
defineProps<{
  title?: string
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
}>()

const { isMobileOrTablet } = useDevice()
</script>

<template>
  <WebsideBlogCategoriesSlider
    v-if="categories.items.length"
    :categories="[...categories.items]"
    :class="[
      'w-full',
      isMobileOrTablet ? 'py-0!' : 'md:p-0!',
    ]"
  />
</template>
