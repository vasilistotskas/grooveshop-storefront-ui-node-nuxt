<script setup lang="ts">
/**
 * The bar above the product grid: how many, in what order, how many per
 * page, and — on a narrow screen — the way into the filters.
 *
 * The active filters live here too rather than inside the drawer that
 * set them. On a phone the drawer is closed by the time the results
 * change, so a chip list hidden inside it could not tell a shopper why
 * they were looking at eleven products.
 */
interface ToolbarProps {
  /** Total number of products matching the current filters. */
  totalResults?: number
  /** The sort the listing is using; empty means the store's own order. */
  currentSort?: string
  itemsPerPage?: number
  hasActiveFilters?: boolean
  activeFilterCount?: number
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
  hasActiveFilters: false,
  activeFilterCount: 0,
})

const emit = defineEmits<ToolbarEmits>()

const { t, locale } = useI18n()

const formattedCount = computed(
  () => new Intl.NumberFormat(locale.value).format(props.totalResults),
)

/**
 * The values must match the Meilisearch endpoint's allowlist
 * (`_ALLOWED_PRODUCT_SORT_FIELDS` in the Django `search` app):
 * finalPrice, likesCount, viewCount, createdAt, each with an optional
 * `-` for descending. An unknown field is dropped in silence and the
 * default order comes back, so these stay camelCase to match both the
 * backend and `ActiveFilters.getSortLabel`.
 */
const sortOptions = computed(() => [
  { label: t('sort.recommended'), value: 'recommended' },
  { label: t('sort.newest'), value: '-createdAt' },
  { label: t('sort.priceAsc'), value: 'finalPrice' },
  { label: t('sort.priceDesc'), value: '-finalPrice' },
  { label: t('sort.mostViewed'), value: '-viewCount' },
])

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
  if (typeof value === 'number') emit('update:itemsPerPage', value)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      class="
        flex flex-col gap-3
        sm:flex-row sm:items-center sm:justify-between
      "
      role="toolbar"
      :aria-label="t('toolbar.aria.browsing_controls')"
    >
      <div class="flex items-center gap-3">
        <UButton
          color="neutral"
          variant="outline"
          icon="i-heroicons-adjustments-horizontal"
          :label="t('filters')"
          class="lg:hidden"
          :aria-label="t('toolbar.aria.toggle_filters')"
          @click="emit('toggle-filters')"
        >
          <template
            v-if="hasActiveFilters"
            #trailing
          >
            <UBadge
              :label="String(activeFilterCount)"
              color="secondary"
              variant="solid"
              size="sm"
            />
          </template>
        </UButton>

        <p
          class="text-sm text-muted"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {{ t('resultsCount', { count: formattedCount }) }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <USelect
          :model-value="currentSort || 'recommended'"
          :items="sortOptions"
          value-key="value"
          icon="i-heroicons-bars-arrow-down"
          class="w-48"
          :aria-label="t('toolbar.aria.sort_products')"
          @update:model-value="handleSortChange"
        />
        <USelect
          :model-value="itemsPerPage"
          :items="itemsPerPageOptions"
          value-key="value"
          class="w-36"
          :aria-label="t('toolbar.aria.items_per_page')"
          @update:model-value="handleItemsPerPageChange"
        />
      </div>
    </div>

    <ProductsFiltersActiveFilters v-if="hasActiveFilters" />
  </div>
</template>

<i18n lang="yaml">
el:
  resultsCount: '{count} προϊόντα'
  filters: Φίλτρα
  toolbar:
    aria:
      browsing_controls: Έλεγχοι περιήγησης προϊόντων
      toggle_filters: Άνοιγμα φίλτρων
      sort_products: Ταξινόμηση προϊόντων
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
  resultsCount: '{count} products'
  filters: Filters
  toolbar:
    aria:
      browsing_controls: Product browsing controls
      toggle_filters: Open filters
      sort_products: Sort products
      items_per_page: Products per page
  sort:
    recommended: Recommended
    newest: Newest
    priceAsc: Price (low first)
    priceDesc: Price (high first)
    mostViewed: Most viewed
  itemsPerPage:
    n: '{n} per page'
</i18n>
