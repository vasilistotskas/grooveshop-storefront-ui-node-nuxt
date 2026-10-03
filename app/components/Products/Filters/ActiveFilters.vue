<script setup lang="ts">
/**
 * The filters in force, as removable chips beside the result count,
 * and a "Clear all" after them.
 *
 * The sort is not among them: it has its own control right there, and
 * clearing the filters keeps it (`CLEARED_FILTERS`).
 */
const { activeFilterChips, filters, updateFilters, removeFilter } = useProductFilters()
const { t, n } = useI18n()
const { getCategoryName, getAttributeValueName } = useProductSearchData(useListingScope())

const chips = computed(() => activeFilterChips.value.filter(isFilterChip))

function chipLabel(chip: FilterChip): string {
  switch (chip.type) {
    case 'price': {
      const { min, max } = chip.value
      if (min !== undefined && max !== undefined) return `${n(min, 'currency')} – ${n(max, 'currency')}`
      if (min !== undefined) return t('from', { price: n(min, 'currency') })
      return max !== undefined ? t('up_to', { price: n(max, 'currency') }) : chip.label
    }
    case 'likes':
      return t('min_likes', { count: chip.value })
    case 'views':
      return t('min_views', { count: chip.value })
    case 'category':
      return getCategoryName(chip.value)
    case 'attribute':
      return getAttributeValueName(chip.value)
    case 'search':
      return `“${chip.value}”`
    default:
      return chip.label
  }
}

function remove(chip: FilterChip) {
  switch (chip.type) {
    case 'category':
      return updateFilters({ categories: filters.value.categories.filter(id => id !== chip.value) })
    case 'attribute':
      return updateFilters({ attributeValues: filters.value.attributeValues.filter(id => id !== chip.value) })
    case 'price':
      return updateFilters({ priceMin: undefined, priceMax: undefined })
    default:
      return removeFilter(chip.key)
  }
}
</script>

<template>
  <ul
    v-if="chips.length"
    class="flex flex-wrap items-center gap-2"
    :aria-label="t('label')"
  >
    <li
      v-for="(chip, index) in chips"
      :key="`${chip.type}-${index}`"
    >
      <UBadge
        color="secondary"
        variant="soft"
        size="lg"
        class="ps-3 pe-2"
      >
        {{ chipLabel(chip) }}
        <button
          type="button"
          class="flex cursor-pointer rounded-full"
          :aria-label="t('remove', { filter: chipLabel(chip) })"
          @click="remove(chip)"
        >
          <UIcon
            name="i-heroicons-x-mark-20-solid"
            class="size-4"
          />
        </button>
      </UBadge>
    </li>
    <li>
      <UButton
        color="neutral"
        variant="ghost"
        size="xs"
        :label="t('clear_all')"
        @click="() => updateFilters(CLEARED_FILTERS)"
      />
    </li>
  </ul>
</template>

<i18n lang="yaml">
el:
  label: Ενεργά φίλτρα
  clear_all: Καθαρισμός όλων
  remove: "Αφαίρεση φίλτρου {filter}"
  from: "Από {price}"
  up_to: "Έως {price}"
  min_likes: "{count}+ likes"
  min_views: "{count}+ προβολές"
en:
  label: Active filters
  clear_all: Clear all
  remove: "Remove the {filter} filter"
  from: "From {price}"
  up_to: "Up to {price}"
  min_likes: "{count}+ likes"
  min_views: "{count}+ views"
</i18n>
