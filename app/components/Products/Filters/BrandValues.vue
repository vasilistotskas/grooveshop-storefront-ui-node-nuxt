<script setup lang="ts">
/**
 * The brands as checkboxes, each with how many products in the listing
 * carry it. Ticking one writes the URL; the listing follows.
 */
import type { BrandOption } from '~/utils/brandOptions'

defineProps<{
  options: BrandOption[]
}>()

const { filters, updateFilters } = useProductFilters()

function toggle(id: string, checked: boolean | 'indeterminate') {
  const rest = filters.value.brands.filter(value => value !== id)
  updateFilters({ brands: checked === true ? [...rest, id] : rest })
}
</script>

<template>
  <ul class="flex flex-col gap-3.5">
    <li
      v-for="option in options"
      :key="option.id"
    >
      <UCheckbox
        :model-value="option.selected"
        size="xl"
        :ui="{ wrapper: 'ms-2.5 text-sm', label: `
          flex justify-between gap-3 font-medium
        ` }"
        @update:model-value="checked => toggle(option.id, checked)"
      >
        <template #label>
          <span>{{ option.label }}</span>
          <span class="font-mono text-xs text-muted">{{ option.count }}</span>
        </template>
      </UCheckbox>
    </li>
  </ul>
</template>
