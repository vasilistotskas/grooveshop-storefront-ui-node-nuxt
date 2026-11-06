<script lang="ts" setup>
/**
 * The way into the catalogue: the store's categories as square photo
 * tiles in a grid (`tiles` and `grid` draw the same one — the design
 * has one) or a swipeable rail.
 *
 * The categories arrive read (`categories`, a data setting the page
 * route resolved: the main categories, or the children of one the
 * operator chose, up to the size they set). A catalogue hung under ONE
 * root offers no choice at its top level, so the read draws that root's
 * children instead (`server/utils/builderData/loaders.ts`).
 *
 * Renders NOTHING when there are none. A section on a fresh store's
 * homepage must be absent, not an empty card — which is what the previous
 * default did, and why a brand-new store opened on a row of placeholders.
 */
const props = withDefaults(defineProps<{
  heading?: string
  layout?: 'slider' | 'grid' | 'tiles'
  surface?: 'default' | 'muted'
  /** What the band lists: the categories, and the rule they came from. */
  categories: ResolvedQuery<ProductCategory, DataDescriptor<'category'>>
}>(), {
  layout: 'tiles',
})

const { t, locale } = useStoreI18n('components/PageSection/ProductCategories')
const localePath = useLocalePath()

const entries = computed(() => props.categories.items.map(category => categoryMenuEntry(category, locale.value)))

const label = computed(() => props.heading || t('heading'))

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
