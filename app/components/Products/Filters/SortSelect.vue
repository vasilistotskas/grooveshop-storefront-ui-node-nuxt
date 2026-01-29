<script setup lang="ts">
const { filters, updateFilters } = useProductFilters()
const { $i18n } = useNuxtApp()

// Define sort options (only using fields that are sortable in Meilisearch)
// Available sortable fields: final_price, likes_count, view_count, discount_percent, created_at
const sortOptions = computed(() => [
  { value: 'final_price', label: $i18n.t('sort.price_asc') },
  { value: '-final_price', label: $i18n.t('sort.price_desc') },
  { value: '-likes_count', label: $i18n.t('sort.popularity') },
  { value: '-view_count', label: $i18n.t('sort.most_viewed') },
  { value: '-created_at', label: $i18n.t('sort.newest') },
])

// Computed property for selected sort with two-way binding
const selectedSort = computed({
  get: () => filters.value.sort || undefined,
  set: value => updateFilters({ sort: value || '' }),
})
</script>

<template>
  <USelect
    v-model="selectedSort"
    :items="sortOptions"
    :placeholder="$i18n.t('sort.default')"
    size="md"
    :aria-label="$t('filters.sort')"
  />
</template>
