<script setup lang="ts">
/**
 * Search Input Component
 *
 * Debounced search input for filtering products by text query.
 * Syncs with URL parameters for shareable search results.
 *
 * @component
 */

const { t } = useI18n()
const { filters, updateFilters } = useProductFilters()
const localSearch = ref(filters.value.search)

// Debounced update to URL (300ms)
const debouncedUpdate = useDebounceFn((value: string) => {
  updateFilters({ search: value })
}, 300)

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
    :placeholder="t('placeholder')"
    size="md"
    :aria-label="t('aria_label')"
    role="searchbox"
    :ui="{
      root: 'w-full',
    }"
  >
    <template v-if="localSearch" #trailing>
      <UButton
        icon="i-heroicons-x-mark"
        variant="ghost"
        size="sm"
        color="neutral"
        :aria-label="t('clear')"
        @click="clearSearch"
      />
    </template>
  </UInput>
</template>

<i18n lang="yaml">
el:
  placeholder: Αναζήτηση προϊόντων...
  aria_label: Αναζήτηση προϊόντων
  clear: Καθαρισμός αναζήτησης
</i18n>
