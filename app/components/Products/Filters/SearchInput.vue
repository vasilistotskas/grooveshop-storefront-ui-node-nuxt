<script setup lang="ts">
const { filters, updateFilters } = useProductFilters()
const localSearch = ref(filters.value.search)

// Debounced update to URL (500ms)
const debouncedUpdate = useDebounceFn((value: string) => {
  updateFilters({ search: value })
}, 500)

// Watch local changes and debounce updates
watch(localSearch, (newValue) => {
  debouncedUpdate(newValue)
})

// Sync with URL changes (e.g., browser back/forward)
watch(() => filters.value.search, (newValue) => {
  if (newValue !== localSearch.value) {
    localSearch.value = newValue
  }
})

// Clear search function
const clearSearch = () => {
  localSearch.value = ''
}
</script>

<template>
  <UInput
    v-model="localSearch"
    icon="i-heroicons-magnifying-glass"
    :placeholder="$t('search.products')"
    size="md"
    :aria-label="$t('search.products')"
    role="searchbox"
  >
    <template v-if="localSearch" #trailing>
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        size="xs"
        :aria-label="$t('filters.clear')"
        @click="clearSearch"
      />
    </template>
  </UInput>
</template>
