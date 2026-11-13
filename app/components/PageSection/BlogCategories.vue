<script lang="ts" setup>
/**
 * The blog's categories as a rail (`slider`, the default) or as tiles
 * (`PageSection/BlogCategoryTiles`, which every design draws).
 *
 * The categories arrive read (`categories`, a data setting the page route
 * resolved). Renders nothing when the blog has no categories yet: a band
 * that paints its padding around an empty rail is 80px of blank page, and
 * on the demo store this section is FIRST, so a store with no posts opened
 * on it. The band is what decides; the rail renders what it is handed.
 */
withDefaults(defineProps<{
  /** The operator's section title, from the section row itself. */
  eyebrow?: string
  title?: string
  subheading?: string
  ctaText?: string
  ctaLink?: string
  layout?: 'slider' | 'tiles'
  /** `bold`: the tiles' bold look (`PageSection/BlogCategoryTilesBold`). */
  look?: 'bold'
  categories: ResolvedQuery<BlogCategory, DataDescriptor<'blogCategory'>>
}>(), {
  layout: 'slider',
})

const linkTo = useLinkTo()
</script>

<template>
  <PageSectionBlogCategoryTiles
    v-if="layout === 'tiles'"
    :eyebrow="eyebrow"
    :title="title"
    :subheading="subheading"
    :cta-text="ctaText"
    :cta-link="ctaLink"
    :categories="categories"
    :look="look"
  />
  <PageSectionBand
    v-else-if="categories.items.length"
    :eyebrow="eyebrow"
    :heading="title"
    :subheading="subheading"
    :cta-text="ctaText"
    :cta-link="ctaLink ? linkTo(ctaLink) : undefined"
    padding="sm"
  >
    <BlogCategoriesSlider
      :categories="[...categories.items]" class="w-full p-0!"
    />
  </PageSectionBand>
</template>
