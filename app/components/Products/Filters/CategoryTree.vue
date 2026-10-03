<script lang="ts" setup>
/**
 * The filter column's categories: the store's tree as links, opened
 * along the path to the page's own category, which is marked.
 *
 * Links, not checkboxes: a category is a page of its own (its own
 * title, description, canonical URL), so choosing one goes there —
 * and a crawler can follow the tree. Each count is the products
 * anywhere beneath it under the other filters (`utils/categoryTree.ts`).
 */
const { t } = useI18n()
const { forest, trail } = useCategoryForest()

const trailIds = computed(() => trail.value.map(node => node.id))
</script>

<template>
  <ProductsFiltersCategoryTreeLevel
    v-if="forest.length"
    :nodes="forest"
    :trail-ids="trailIds"
    :aria-label="t('label')"
  />
</template>

<i18n lang="yaml">
el:
  label: Κατηγορίες
en:
  label: Categories
</i18n>
