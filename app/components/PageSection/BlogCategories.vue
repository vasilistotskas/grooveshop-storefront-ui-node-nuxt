<script lang="ts" setup>
/**
 * The blog's categories as a rail.
 *
 * The categories arrive read (`categories`, a data setting the page route
 * resolved). Renders nothing when the blog has no categories yet: a band
 * that paints its padding around an empty rail is 80px of blank page, and
 * on the demo store this section is FIRST, so a store with no posts opened
 * on it. The band is what decides; the rail renders what it is handed.
 */
defineProps<{
  /** The operator's section title, from the section row itself. */
  title?: string
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
}>()
</script>

<template>
  <PageSectionBand
    v-if="categories.items.length"
    :heading="title"
    padding="sm"
  >
    <BlogCategoriesSlider
      :categories="[...categories.items]" class="w-full p-0!"
    />
  </PageSectionBand>
</template>
