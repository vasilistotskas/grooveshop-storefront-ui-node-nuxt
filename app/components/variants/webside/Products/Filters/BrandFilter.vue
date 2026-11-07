<script setup lang="ts">
/**
 * Brand Filter Component
 *
 * The brands as multi-select rows, each with how many products in the
 * listing carry it. The options (and the quick search's narrowing of them)
 * come from the sidebar, which builds them from the shared brand data.
 *
 * @component
 */
import type { BrandOption } from '~/utils/brandOptions'

defineProps<{
  options: BrandOption[]
}>()

const { filters, updateFilters } = useProductFilters()
const { t } = useStoreI18n('components/variants/webside/Products/Filters/BrandFilter')

async function toggleBrand(id: string) {
  const rest = filters.value.brands.filter(value => value !== id)
  await updateFilters({
    brands: filters.value.brands.includes(id) ? rest : [...rest, id],
  })
}
</script>

<template>
  <UScrollArea class="max-h-64">
    <div class="space-y-1 pr-2">
      <button
        v-for="option in options"
        :key="option.id"
        type="button"
        class="
          flex w-full cursor-pointer items-center justify-between gap-3
          rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150
          focus:outline-none
          focus-visible:ring-2 focus-visible:ring-primary-500
        "
        :class="{
          'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300': option.selected,
          'hover:bg-neutral-100 dark:hover:bg-neutral-800': !option.selected,
        }"
        :aria-pressed="option.selected"
        @click="toggleBrand(option.id)"
      >
        <span class="flex min-w-0 flex-1 items-center gap-2">
          <span
            class="
              flex size-5 items-center justify-center rounded-[0.25rem] border
              transition-colors duration-150
            "
            :class="{
              'border-primary-500 bg-primary-500': option.selected,
              'border-neutral-300 dark:border-neutral-600': !option.selected,
            }"
          >
            <UIcon
              v-if="option.selected"
              name="i-heroicons-check"
              class="size-3 text-white"
            />
          </span>
          <span class="truncate">{{ option.label }}</span>
        </span>
        <UBadge
          :label="option.count.toString()"
          color="neutral"
          variant="soft"
        />
        <!-- The button's name is its visible text (WCAG 2.5.3); the unit rides along, unseen. -->
        <span class="sr-only">{{ t('products') }}</span>
      </button>
    </div>
  </UScrollArea>
</template>

<i18n lang="yaml">
el:
  products: προϊόντα
en:
  products: products
</i18n>
