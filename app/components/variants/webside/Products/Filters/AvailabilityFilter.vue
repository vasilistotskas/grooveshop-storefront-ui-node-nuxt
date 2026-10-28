<script setup lang="ts">
/**
 * Availability Filter Component
 *
 * Two switches that narrow the listing: only what can be bought now, and
 * only what is marked down. "On offer" is a product's own markdown, the
 * discount its card shows, not a cart promotion.
 *
 * @component
 */
const { filters, updateFilters } = useProductFilters()
const { t } = useStoreI18n('components/variants/webside/Products/Filters/AvailabilityFilter')

// Labels on the left, the switches on the right, as the rows above them read.
const SWITCH_UI = {
  root: 'w-full flex-row-reverse',
  wrapper: 'm-0 w-full',
  label: 'cursor-pointer text-sm',
}
</script>

<template>
  <ul class="space-y-3 px-3">
    <li>
      <USwitch
        :model-value="filters.inStock"
        :label="t('in_stock')"
        :ui="SWITCH_UI"
        @update:model-value="value => updateFilters({ inStock: value })"
      />
    </li>
    <li>
      <USwitch
        :model-value="filters.onOffer"
        :label="t('on_offer')"
        :ui="SWITCH_UI"
        @update:model-value="value => updateFilters({ onOffer: value })"
      />
    </li>
  </ul>
</template>

<i18n lang="yaml">
el:
  in_stock: Μόνο σε απόθεμα
  on_offer: Σε προσφορά
en:
  in_stock: In stock only
  on_offer: On offer
</i18n>
