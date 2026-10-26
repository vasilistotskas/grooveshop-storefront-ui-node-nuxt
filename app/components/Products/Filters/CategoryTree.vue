<script lang="ts" setup>
/**
 * The filter column's categories: the store's tree as links, opened
 * along the path to the page's own category, which is marked.
 *
 * Links, not checkboxes: a category is a page of its own (its own
 * title, description, canonical URL), so choosing one goes there —
 * and a crawler can follow the tree. "All products" tops it: the way
 * back out of a category. Each count is the products
 * anywhere beneath it under the other filters (`utils/categoryTree.ts`).
 */
const { t } = useI18n()
const localePath = useLocalePath()
const { forest, trail } = useCategoryForest()

// The store-wide listing has no trail: that page is "all products".
const onIndex = computed(() => trail.value.length === 0)

const trailIds = computed(() => trail.value.map(node => node.id))
</script>

<template>
  <div
    v-if="forest.length"
    class="flex flex-col gap-2"
  >
    <!-- The way back from a category to everything. -->
    <ULink
      :to="localePath('products')"
      :aria-current="onIndex ? 'page' : undefined"
      class="text-sm font-semibold"
      :class="onIndex ? 'text-accent' : 'text-highlighted hover:text-accent'"
    >
      <span>{{ t('all_products') }}</span>
    </ULink>
    <ProductsFiltersCategoryTreeLevel
      :nodes="forest"
      :trail-ids="trailIds"
      :aria-label="t('label')"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  label: Κατηγορίες
  all_products: Όλα τα προϊόντα
en:
  label: Categories
  all_products: All products
</i18n>
