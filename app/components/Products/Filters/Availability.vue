<script setup lang="ts">
/**
 * Two switches that narrow the listing: only what can be bought now, and
 * only what is marked down. "On offer" is a product's own markdown — the
 * discount its card shows — not a cart promotion. Flipping one writes the
 * URL; the listing follows.
 */
const { t } = useI18n()
const { filters, updateFilters } = useProductFilters()

// Right-aligned switches under left-aligned labels, as the design draws them.
const SWITCH_UI = {
  root: 'w-full flex-row-reverse',
  wrapper: 'm-0 w-full',
  label: 'cursor-pointer text-sm font-semibold text-default',
}
</script>

<template>
  <ul class="flex flex-col gap-3.5">
    <li>
      <USwitch
        :model-value="filters.inStock"
        :label="t('in_stock')"
        color="secondary"
        :ui="SWITCH_UI"
        @update:model-value="value => updateFilters({ inStock: value })"
      />
    </li>
    <li>
      <USwitch
        :model-value="filters.onOffer"
        :label="t('on_offer')"
        color="secondary"
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
