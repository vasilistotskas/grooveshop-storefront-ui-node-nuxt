<script setup lang="ts">
/**
 * Attribute Filter Component
 *
 * Displays product attributes grouped by type with multi-select checkboxes.
 * Shows facet counts and disables values with zero products.
 * Follows the same pattern as CategoryFilter.vue.
 *
 * @component
 */

const { filters, updateFilters } = useProductFilters()
const { locale, t } = useI18n()

// Use shared attribute data from the centralized composable
const {
  allAttributes,
  attributesStatus,
  allAttributeValues,
  attributeValuesStatus,
  attributeValueFacets,
} = useProductSearchData()

// Selected attribute values from filters
const selectedAttributeValues = computed(() => filters.value.attributeValues)

// Group attributes by attribute type for accordion display
const attributeGroups = computed(() => {
  if (!allAttributes.value?.results || !allAttributeValues.value?.results) return []

  // Create a map of attribute values by attribute ID for quick lookup
  const valuesByAttributeId = new Map<number, typeof allAttributeValues.value.results>()
  allAttributeValues.value.results.forEach((value) => {
    if (!valuesByAttributeId.has(value.attribute)) {
      valuesByAttributeId.set(value.attribute, [])
    }
    valuesByAttributeId.get(value.attribute)!.push(value)
  })

  return allAttributes.value.results
    .map((attribute) => {
      // Extract attribute name
      const name = extractTranslated(attribute, 'name', locale.value)

      // Get values for this attribute
      const attributeValues = valuesByAttributeId.get(attribute.id) || []

      // Process and sort attribute values
      const values = attributeValues
        .filter(v => v.active) // Only show active values
        .map((value) => {
          const valueLabel = extractTranslated(value, 'value', locale.value)
          const count = attributeValueFacets.value[value.id] ?? 0
          const isSelected = selectedAttributeValues.value.includes(value.id.toString())

          return {
            id: value.id,
            label: valueLabel,
            count,
            isSelected,
            sortOrder: value.sortOrder ?? 0,
          }
        })
        .sort((a, b) => {
          // Sort by: selected first, then by product count, then by sort_order
          if (a.isSelected && !b.isSelected) return -1
          if (!a.isSelected && b.isSelected) return 1

          if (a.count !== b.count) return b.count - a.count

          return a.sortOrder - b.sortOrder
        })

      return {
        id: attribute.id,
        name,
        values,
      }
    })
    .filter(group => group.values.length > 0) // Only show groups with values
})

// Toggle attribute value selection
const toggleAttributeValue = (valueId: string) => {
  const currentValues = [...selectedAttributeValues.value]
  const index = currentValues.indexOf(valueId)

  // If value is already selected, allow removal
  if (index > -1) {
    currentValues.splice(index, 1)
    updateFilters({ attributeValues: currentValues })
    return
  }

  // If value has zero products, don't allow selection
  const count = attributeValueFacets.value[valueId] ?? 0
  if (count === 0) {
    return
  }

  // Add to selection
  currentValues.push(valueId)
  updateFilters({ attributeValues: currentValues })
}

// Check if value is disabled (zero products and not selected)
const isValueDisabled = (valueId: string) => {
  return (attributeValueFacets.value[valueId] ?? 0) === 0
    && !selectedAttributeValues.value.includes(valueId)
}
</script>

<template>
  <div class="space-y-4">
    <!-- Loading state -->
    <template v-if="attributesStatus === 'pending' || attributeValuesStatus === 'pending'">
      <USkeleton v-for="i in 3" :key="i" class="h-12 rounded-lg" />
    </template>

    <!-- Attribute groups -->
    <template v-else-if="attributeGroups.length > 0">
      <UAccordion
        type="multiple"
        :items="attributeGroups.map(g => ({
          label: g.name,
          value: g.id.toString(),
          slot: `attribute-${g.id}`,
        }))"
        :ui="{
          item: `
            border-b border-neutral-200
            last:border-b-0
            dark:border-neutral-700
          `,
          trigger: 'py-3 text-sm font-medium',
        }"
      >
        <template v-for="group in attributeGroups" :key="group.id" #[`attribute-${group.id}`]>
          <UScrollArea class="max-h-48">
            <div class="space-y-1 pr-2 pb-2">
              <button
                v-for="value in group.values"
                :key="value.id"
                type="button"
                class="
                  cursor-pointer w-full flex items-center justify-between gap-3
                  px-3 py-2 rounded-lg
                  text-left text-sm
                  transition-colors duration-150
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500
                "
                :class="{
                  'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300':
                    selectedAttributeValues.includes(value.id.toString()),
                  'hover:bg-neutral-100 dark:hover:bg-neutral-800':
                    !isValueDisabled(value.id.toString()),
                  'opacity-40 cursor-not-allowed':
                    isValueDisabled(value.id.toString()),
                }"
                :disabled="isValueDisabled(value.id.toString())"
                :aria-pressed="selectedAttributeValues.includes(value.id.toString())"
                :aria-label="`${value.label} - ${value.count} ${t('products')}`"
                @click="toggleAttributeValue(value.id.toString())"
              >
                <span class="flex items-center gap-2 flex-1 min-w-0">
                  <span
                    class="
                      flex items-center justify-center
                      size-5 rounded border
                      transition-colors duration-150
                    "
                    :class="{
                      'bg-primary-500 border-primary-500':
                        selectedAttributeValues.includes(value.id.toString()),
                      'border-neutral-300 dark:border-neutral-600':
                        !selectedAttributeValues.includes(value.id.toString()),
                    }"
                  >
                    <UIcon
                      v-if="selectedAttributeValues.includes(value.id.toString())"
                      name="i-heroicons-check"
                      class="size-3 text-white"
                    />
                  </span>
                  <span class="truncate">{{ value.label }}</span>
                </span>
                <UBadge
                  :label="value.count.toString()"
                  color="neutral"
                  variant="soft"
                  :class="{ 'opacity-50': value.count === 0 }"
                />
              </button>
            </div>
          </UScrollArea>
        </template>
      </UAccordion>
    </template>

    <!-- Empty state -->
    <template v-else>
      <div class="py-8 text-center">
        <UIcon
          name="i-heroicons-tag"
          class="mx-auto size-10 text-neutral-300 dark:text-neutral-600"
        />
        <p class="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          {{ t('no_attributes') }}
        </p>
      </div>
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  products: προϊόντα
  no_attributes: Δεν υπάρχουν διαθέσιμα χαρακτηριστικά
en:
  products: products
  no_attributes: No attributes available
de:
  products: Produkte
  no_attributes: Keine Attribute verfügbar
</i18n>
