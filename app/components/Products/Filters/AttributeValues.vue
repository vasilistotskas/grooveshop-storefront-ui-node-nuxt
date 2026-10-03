<script setup lang="ts">
/**
 * One attribute's values as checkboxes, each with how many products in
 * the listing carry it. Ticking one writes the URL; the listing follows.
 */
import type { AttributeGroup } from '~/utils/attributeGroups'

defineProps<{
  group: AttributeGroup
}>()

const { filters, updateFilters } = useProductFilters()

function toggle(id: string, checked: boolean | 'indeterminate') {
  const rest = filters.value.attributeValues.filter(value => value !== id)
  updateFilters({ attributeValues: checked === true ? [...rest, id] : rest })
}
</script>

<template>
  <ul class="flex flex-col gap-3.5">
    <li
      v-for="option in group.options"
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
