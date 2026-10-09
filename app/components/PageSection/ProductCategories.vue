<script lang="ts" setup>
/**
 * The way into the catalogue: the store's categories as square photo
 * tiles in a grid (`tiles` and `grid` draw the same one — the design
 * has one) or a swipeable rail.
 *
 * Renders NOTHING when the store has no categories (or the catalogue is
 * switched off, in which case nothing is fetched at all). A section on
 * a fresh store's homepage must be absent, not an empty card — which is
 * what the previous default did, and why a brand-new store opened on a
 * row of placeholders.
 */
const props = withDefaults(defineProps<{
  /** The operator's section title; `heading` wins when both are set. */
  title?: string
  heading?: string
  layout?: 'slider' | 'grid' | 'tiles'
  /** Draw the children of one category instead of the tree's roots. */
  parentId?: number
  limit?: number
  surface?: 'default' | 'muted'
}>(), {
  layout: 'tiles',
  limit: 8,
})

const { t } = useI18n()
const localePath = useLocalePath()
const { categories } = useCategoryMenu()

const entries = computed(() => {
  const all = categories.value

  if (props.parentId) {
    const parent = all.find(entry => entry.id === props.parentId)
    return (parent?.children ?? []).slice(0, props.limit)
  }

  // A catalogue hung under ONE root ("Accessories", "Shop") offers no
  // choice at its top level: the band would draw a single tile whose
  // only job is to open the tree. Draw that root's CHILDREN instead —
  // they are what the merchant means by "shop by category". With two
  // or more roots the roots ARE the choice.
  if (all.length === 1 && all[0]?.children?.length) {
    return all[0].children.slice(0, props.limit)
  }

  return all.slice(0, props.limit)
})

const label = computed(() => props.heading || props.title || t('heading'))

/**
 * Up to six tiles in a row on a desk, as the design sets them — and
 * fewer when there are fewer, so four categories fill the row instead
 * of leaving two empty columns. Literal classes so Tailwind sees them.
 */
const DESK_COLUMNS = [
  'lg:grid-cols-1',
  'lg:grid-cols-2',
  'lg:grid-cols-3',
  'lg:grid-cols-4',
  'lg:grid-cols-5',
  'lg:grid-cols-6',
] as const
</script>

<template>
  <PageSectionBand
    v-if="entries.length"
    :heading="label"
    :cta-text="t('all_products')"
    :cta-link="localePath('products')"
    :surface="surface"
  >
    <UCarousel
      v-if="layout === 'slider'"
      v-slot="{ item }"
      :items="entries"
      :ui="{
        // Slides are `items-start` by default, so a tile with a
        // two-line name leaves its neighbours short.
        container: 'items-stretch',
        item: `
          basis-2/3 px-2
          sm:basis-1/3
          lg:basis-1/5
        `,
      }"
      class="-mx-2"
    >
      <PageSectionCategoryTile :category="item" />
    </UCarousel>

    <div
      v-else
      :class="[
        'grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:gap-5',
        DESK_COLUMNS[Math.min(entries.length, DESK_COLUMNS.length) - 1],
      ]"
    >
      <PageSectionCategoryTile
        v-for="entry in entries"
        :key="entry.id"
        :category="entry"
      />
    </div>
  </PageSectionBand>
</template>

<i18n lang="yaml">
el:
  heading: Κατηγορίες
  all_products: Όλα τα προϊόντα
en:
  heading: Categories
  all_products: All products
</i18n>
