<script setup lang="ts">
/**
 * The bar above the product grid.
 *
 * Wide: how many, the filters in force as chips, then the order and the
 * page size. Narrow: the way into the filters beside the order, then
 * how many and a way to clear them — the drawer that set the filters is
 * closed by the time the results change, so this row is what says why
 * there are eleven products.
 */
interface ToolbarProps {
  /** Total number of products matching the current filters. */
  totalResults?: number
  /** The sort the listing is using; empty means the store's own order. */
  currentSort?: string
  itemsPerPage?: number
}

interface ToolbarEmits {
  (e: 'update:sort', value: string): void
  (e: 'update:itemsPerPage', value: number): void
  /** The narrow-screen filter drawer. */
  (e: 'toggle-filters'): void
}

const props = withDefaults(defineProps<ToolbarProps>(), {
  totalResults: 0,
  currentSort: '',
  itemsPerPage: 12,
})

const emit = defineEmits<ToolbarEmits>()

const { t, locale } = useI18n()
const { activeFilterChips, updateFilters } = useProductFilters()

/** Filters a shopper set; the sort is a choice of its own, not one of them. */
const filterCount = computed(() => activeFilterChips.value.filter(isFilterChip).length)

const formattedCount = computed(
  () => new Intl.NumberFormat(locale.value).format(props.totalResults),
)

/**
 * The values must match the Meilisearch endpoint's allowlist
 * (`_ALLOWED_PRODUCT_SORT_FIELDS` in the Django `search` app):
 * finalPrice, likesCount, viewCount, createdAt, each with an optional
 * `-` for descending. An unknown field is dropped in silence and the
 * default order comes back.
 */
const sortOptions = computed(() => [
  { label: t('sort.recommended'), value: 'recommended' },
  { label: t('sort.newest'), value: '-createdAt' },
  { label: t('sort.priceAsc'), value: 'finalPrice' },
  { label: t('sort.priceDesc'), value: '-finalPrice' },
  { label: t('sort.mostViewed'), value: '-viewCount' },
])

const sortValue = computed(() => props.currentSort || 'recommended')
const sortLabel = computed(() => sortOptions.value.find(option => option.value === sortValue.value)?.label)

const itemsPerPageOptions = computed(() =>
  [12, 24, 48].map(value => ({
    label: t('itemsPerPage.n', { n: value }),
    value,
  })),
)

const handleSortChange = (value: unknown) => {
  if (typeof value !== 'string') return
  // `recommended` is the absence of a sort, which is how the URL
  // spells it: no `?sort=` at all.
  emit('update:sort', value === 'recommended' ? '' : value)
}

const handleItemsPerPageChange = (value: unknown) => {
  // USelect hands back the `value-key`'d value as a STRING — Reka's
  // select stores strings, and typing it as a number needs the
  // `number` model modifier, which is only available through v-model;
  // this control is bound with :model-value/@update:model-value.
  const next = Number(value)
  if (Number.isFinite(next) && next > 0) emit('update:itemsPerPage', next)
}
</script>

<template>
  <div>
    <div
      class="
        hidden items-center justify-between gap-4 border-b border-default
        pb-4.5
        lg:flex
      "
    >
      <div class="flex min-w-0 items-center gap-4">
        <p class="shrink-0 font-bold text-highlighted">
          {{ t('resultsCount', totalResults, { named: { count: formattedCount } }) }}
        </p>
        <ProductsFiltersActiveFilters />
      </div>

      <div class="flex shrink-0 gap-2">
        <USelect
          :model-value="sortValue"
          :items="sortOptions"
          value-key="value"
          :aria-label="t('sort_products')"
          :ui="{ base: 'h-9 rounded-full ps-3.5 font-semibold ring-default' }"
          @update:model-value="handleSortChange"
        >
          {{ t('sort_by', { sort: sortLabel }) }}
        </USelect>
        <USelect
          :model-value="itemsPerPage"
          :items="itemsPerPageOptions"
          value-key="value"
          :aria-label="t('items_per_page')"
          :ui="{ base: 'h-9 rounded-full ps-3.5 font-semibold ring-default' }"
          @update:model-value="handleItemsPerPageChange"
        />
      </div>
    </div>

    <div class="flex flex-col gap-3.5 lg:hidden">
      <div class="grid grid-cols-2 gap-2.5">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-adjustments-horizontal"
          :label="t('filters')"
          class="justify-center"
          :aria-label="filterCount ? t('open_filters_n', { count: filterCount }) : t('open_filters')"
          @click="emit('toggle-filters')"
        >
          <template
            v-if="filterCount"
            #trailing
          >
            <UBadge
              :label="String(filterCount)"
              color="secondary"
              variant="soft"
              size="sm"
            />
          </template>
        </UButton>
        <USelect
          :model-value="sortValue"
          :items="sortOptions"
          value-key="value"
          :aria-label="t('sort_products')"
          :ui="{ base: 'h-11 rounded-full ps-5 font-semibold ring-default' }"
          @update:model-value="handleSortChange"
        />
      </div>

      <div class="flex min-h-8 items-center justify-between gap-3">
        <p class="text-sm font-semibold text-muted">
          {{ t('resultsCount', totalResults, { named: { count: formattedCount } }) }}
        </p>
        <UButton
          v-if="filterCount"
          color="neutral"
          variant="ghost"
          size="xs"
          :label="t('clear_filters')"
          @click="() => updateFilters(CLEARED_FILTERS)"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  resultsCount: '{count} προϊόν | {count} προϊόντα'
  filters: Φίλτρα
  open_filters: Άνοιγμα φίλτρων
  open_filters_n: 'Άνοιγμα φίλτρων, {count} ενεργά'
  clear_filters: Καθαρισμός φίλτρων
  sort_products: Ταξινόμηση προϊόντων
  sort_by: 'Ταξινόμηση: {sort}'
  items_per_page: Προϊόντα ανά σελίδα
  sort:
    recommended: Προτεινόμενα
    newest: Νεότερα
    priceAsc: Τιμή (χαμηλή πρώτα)
    priceDesc: Τιμή (υψηλή πρώτα)
    mostViewed: Δημοφιλή
  itemsPerPage:
    n: '{n} ανά σελίδα'
en:
  resultsCount: '{count} product | {count} products'
  filters: Filters
  open_filters: Open filters
  open_filters_n: 'Open filters, {count} active'
  clear_filters: Clear filters
  sort_products: Sort products
  sort_by: 'Sort: {sort}'
  items_per_page: Products per page
  sort:
    recommended: Featured
    newest: Newest
    priceAsc: Price (low first)
    priceDesc: Price (high first)
    mostViewed: Most viewed
  itemsPerPage:
    n: '{n} per page'
</i18n>
