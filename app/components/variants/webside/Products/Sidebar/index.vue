<script lang="ts" setup>
/**
 * Products Sidebar Component
 *
 * A modern, responsive filter sidebar for the product listing page.
 * Uses UAccordion for collapsible filter sections and USlideover for mobile.
 *
 * Features:
 * - Accordion-based filter sections with smooth animations
 * - Brand and availability (in stock, on offer) sections
 * - A quick search over the sections and a button that opens or folds all
 * - Responsive: Slideover on mobile/tablet, sticky sidebar on desktop
 * - Active filter count badges per section
 * - Clear all filters functionality
 * - Accessible with proper ARIA labels and keyboard navigation
 * - Reduced motion support
 *
 * @component
 */
import type { AccordionItem } from '@nuxt/ui'
import type { BrandOption } from '~/utils/brandOptions'

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const { t, locale } = useStoreI18n('components/variants/webside/Products/Sidebar/index')
const { isMobileOrTablet } = useDevice()
const { filters, hasActiveFilters, activeFilterCount, clearFilters, filterCountBySection } = useProductFilters()
const { allAttributes, allAttributeValues, attributeValueFacets } = useProductSearchData(useListingScope())
const { allBrands, brandFacets } = useProductBrands(useListingScope())

const sidebar = ref<HTMLElement | null>(null)
const slideoverOpen = ref(false)

// Reusable template for filter content (shared between mobile and desktop)
const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

// Not before the list is here: until then a selected brand has no name to show.
const brandOptions = computed(() => allBrands.value
  ? buildBrandOptions(allBrands.value, brandFacets.value, filters.value.brands)
  : [])

const attributeGroups = computed(() => buildAttributeGroups(
  allAttributes.value?.results ?? [],
  allAttributeValues.value?.results ?? [],
  attributeValueFacets.value,
  filters.value.attributeValues,
  translatorFor(locale.value),
))

// One member per slot, so each slot's `item` is typed by its own shape.
type SectionBase = AccordionItem & { value: string, title: string }
type Section
  = | (SectionBase & { slot: 'price' | 'popularity' | 'views' | 'categories' | 'availability' })
    | (SectionBase & { slot: 'brand', options: BrandOption[] })
    | (SectionBase & { slot: 'attributes', query: string })

/** A section's heading, with how many of its filters are on. */
function heading(title: string, count: number) {
  return { title, label: count > 0 ? `${title} (${count})` : title }
}

// Accordion items configuration - using slot property for custom body content
const sections = computed<Section[]>(() => [
  { ...heading(t('filters.price'), filterCountBySection.value.price), icon: 'i-heroicons-currency-euro', value: 'price', slot: 'price' },
  { ...heading(t('filters.popularity'), filterCountBySection.value.popularity), icon: 'i-heroicons-heart', value: 'popularity', slot: 'popularity' },
  { ...heading(t('filters.view_count'), filterCountBySection.value.viewCount), icon: 'i-heroicons-eye', value: 'views', slot: 'views' },
  { ...heading(t('filters.categories'), filterCountBySection.value.categories), icon: 'i-heroicons-folder', value: 'categories', slot: 'categories' },
  ...(brandOptions.value.length
    ? [{ ...heading(t('filters.brands'), filterCountBySection.value.brands), icon: 'i-heroicons-building-storefront', value: 'brands', slot: 'brand' as const, options: brandOptions.value }]
    : []),
  { ...heading(t('filters.attributes'), filterCountBySection.value.attributes), icon: 'i-heroicons-tag', value: 'attributes', slot: 'attributes', query: '' },
  { ...heading(t('filters.availability'), filterCountBySection.value.availability), icon: 'i-heroicons-check-badge', value: 'availability', slot: 'availability' },
])

// The quick search, offered once the filters outgrow a screen. Each
// attribute counts as a section of its own, as in the default design.
// Matching ignores case and accents (`foldText`). A section whose own
// title matches stays whole; the brand and attribute sections stay with
// their matching options (and any selected one); the rest drop out.
const query = ref('')
const searchOffered = computed(() => sections.value.length - 1 + attributeGroups.value.length >= FILTER_SEARCH_MIN_SECTIONS)
const foldedQuery = computed(() => searchOffered.value ? foldText(query.value.trim()) : '')
const searching = computed(() => foldedQuery.value !== '')

const shownSections = computed<Section[]>(() => {
  const needle = foldedQuery.value
  if (!needle) return sections.value
  return sections.value.flatMap((item): Section[] => {
    if (labelMatches(item.title, needle)) return [item]
    if (item.slot === 'brand') {
      const options = narrowOptions(item.options, needle)
      return options ? [{ ...item, options }] : []
    }
    if (item.slot === 'attributes') {
      const matches = attributeGroups.value.some(group =>
        labelMatches(group.label, needle) || group.options.some(option => labelMatches(option.label, needle)))
      return matches ? [{ ...item, query: needle }] : []
    }
    return []
  })
})

// Price and categories start open. While a query is set every section it
// leaves is open, and folding is not remembered: the query is what a
// shopper is working with.
const folded = ref<string[]>(['popularity', 'views', 'brands', 'attributes', 'availability'])
const openSections = computed({
  get: () => (searching.value ? shownSections.value : sections.value)
    .map(item => item.value)
    .filter(value => searching.value || !folded.value.includes(value)),
  set: (open: string[]) => {
    if (searching.value) return
    folded.value = sections.value.map(item => item.value).filter(value => !open.includes(value))
  },
})

const allOpen = computed(() => folded.value.length === 0)

function toggleAll() {
  folded.value = allOpen.value ? sections.value.map(item => item.value) : []
}

function handleClearFilters() {
  clearFilters()
  if (isMobileOrTablet.value) {
    slideoverOpen.value = false
  }
}

function toggleDrawer() {
  slideoverOpen.value = !slideoverOpen.value
}

defineExpose({
  toggleDrawer,
})

// Sticky sidebar behavior for desktop
onMounted(() => {
  if (!sidebar.value) return
  const { onScroll } = useSticky(sidebar.value, 150)
  setTimeout(() => onScroll(), 50)
})

// Focus management for slideover
watch(slideoverOpen, (isOpen) => {
  if (isOpen && isMobileOrTablet.value) {
    nextTick(() => {
      const slideover = document.querySelector('[role="dialog"]')
      const firstFocusable = slideover?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      firstFocusable?.focus()
    })
  }
})
</script>

<template>
  <!-- Reusable filter content template -->
  <DefineFiltersTemplate>
    <div class="flex flex-col">
      <!-- Quick search over the sections, once there are many -->
      <UInput
        v-if="searchOffered"
        v-model="query"
        icon="i-heroicons-magnifying-glass"
        size="sm"
        :placeholder="t('filters.search_placeholder')"
        :aria-label="t('filters.search_label')"
      >
        <template
          v-if="query.length"
          #trailing
        >
          <UButton
            icon="i-heroicons-x-mark"
            variant="ghost"
            color="neutral"
            size="sm"
            :aria-label="t('filters.search_clear')"
            @click="() => { query = '' }"
          />
        </template>
      </UInput>

      <div
        v-if="!searching"
        class="flex justify-end pt-2"
      >
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          :icon="allOpen ? 'i-heroicons-chevron-double-up' : 'i-heroicons-chevron-double-down'"
          :label="allOpen ? t('filters.collapse_all') : t('filters.expand_all')"
          :aria-label="allOpen ? t('filters.collapse_all_label') : t('filters.expand_all_label')"
          @click="toggleAll"
        />
      </div>

      <p
        v-if="searching && !shownSections.length"
        role="status"
        class="py-6 text-center text-sm text-neutral-700 dark:text-neutral-300"
      >
        {{ t('filters.no_match', { query: query.trim() }) }}
      </p>

      <!-- Accordion Filter Sections -->
      <UAccordion
        v-else
        v-model="openSections"
        type="multiple"
        :items="shownSections"
        :ui="{
          header: 'mb-2',
          root: 'flex flex-col gap-2 pt-2',
          item: `
            border-b border-neutral-200
            last:border-b-0
            dark:border-neutral-800
          `,
          trigger: `
            -mx-2 cursor-pointer rounded-lg px-2 py-4 font-medium
            text-neutral-900 transition-colors duration-150
            hover:bg-neutral-50
            dark:text-neutral-100
            dark:hover:bg-neutral-800/50
          `,
          content: 'pb-4',
          body: 'pt-2',
          leadingIcon: 'size-5 text-primary-500',
          trailingIcon: `
            size-4 text-neutral-400 transition-transform duration-200
          `,
        }"
      >
        <!-- Price Range Filter - custom slot renders in body -->
        <template #price>
          <WebsideProductsFiltersPriceRange />
        </template>

        <!-- Popularity Filter -->
        <template #popularity>
          <WebsideProductsFiltersPopularityFilter />
        </template>

        <!-- View Count Filter -->
        <template #views>
          <WebsideProductsFiltersViewCountFilter />
        </template>

        <!-- Categories Filter -->
        <template #categories>
          <WebsideProductsFiltersCategoryFilter />
        </template>

        <!-- Brand Filter -->
        <template #brand="{ item }">
          <WebsideProductsFiltersBrandFilter :options="item.options" />
        </template>

        <!-- Attributes Filter -->
        <template #attributes="{ item }">
          <WebsideProductsFiltersAttributeFilter :query="item.query" />
        </template>

        <!-- Availability Filter -->
        <template #availability>
          <WebsideProductsFiltersAvailabilityFilter />
        </template>
      </UAccordion>

      <USeparator v-if="hasActiveFilters" />

      <!-- Active Filters Summary -->
      <WebsideProductsFiltersActiveFilters />
    </div>
  </DefineFiltersTemplate>

  <!-- Desktop: Sticky Sidebar -->
  <div
    v-if="!isMobileOrTablet"
    ref="sidebar"
    v-bind="attrs"
    role="region"
    :aria-label="t('filters.title')"
    class="
      products-sidebar
      relative h-fit w-72
      transition-all duration-300 ease-in-out
      shrink-0
    "
  >
    <UCard
      :ui="{
        root: 'overflow-hidden',
        header: `
          border-b border-neutral-200 p-2
          sm:p-3
          dark:border-neutral-800
        `,
        body: `
          p-2
          sm:p-4
        `,
      }"
    >
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div
              class="
                flex items-center justify-center
                size-9 rounded-lg
                bg-primary-100 dark:bg-primary-900/30
              "
            >
              <UIcon
                name="i-heroicons-funnel"
                class="size-5 text-primary-600 dark:text-primary-400"
              />
            </div>
            <div>
              <h2 class="text-lg font-semibold text-neutral-900 dark:text-white">
                {{ t('filters.title') }}
              </h2>
              <p
                v-if="hasActiveFilters"
                class="text-xs text-neutral-700 dark:text-neutral-300"
              >
                {{ t('filters.active_count', { count: activeFilterCount }) }}
              </p>
            </div>
          </div>
          <UButton
            v-if="hasActiveFilters"
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-heroicons-x-mark"
            :aria-label="t('filters.clear_all')"
            @click="handleClearFilters"
          >
            {{ t('filters.clear') }}
          </UButton>
        </div>
      </template>

      <ReuseFiltersTemplate />
    </UCard>
  </div>

  <!-- Mobile / Tablet: Slideover drawer. Opened via toggleDrawer() (exposed
       above) from the Toolbar's filter button (products page wires
       @toggle-filters -> sidebarRef.toggleDrawer()). The desktop sidebar is
       hidden on mobile, so without this the filter button toggled state that
       rendered nothing and filtering was unreachable on mobile/tablet. -->
  <USlideover
    v-if="isMobileOrTablet"
    v-model:open="slideoverOpen"
    side="left"
    :title="t('filters.title')"
    :ui="{ body: 'p-4' }"
  >
    <template #body>
      <ReuseFiltersTemplate />
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-between gap-3">
        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="ghost"
          icon="i-heroicons-x-mark"
          @click="handleClearFilters"
        >
          {{ t('filters.clear_all') }}
        </UButton>
        <UButton
          class="ml-auto"
          color="primary"
          variant="solid"
          icon="i-heroicons-check"
          @click="slideoverOpen = false"
        >
          {{ t('filters.show_results') }}
        </UButton>
      </div>
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  filters:
    title: Φίλτρα
    description: Φιλτράρετε τα προϊόντα
    price: Τιμή
    popularity: Δημοτικότητα
    view_count: Προβολές
    categories: Κατηγορίες
    brands: Μάρκες
    attributes: Χαρακτηριστικά
    availability: Διαθεσιμότητα
    search_label: Αναζήτηση στα φίλτρα
    search_placeholder: Αναζήτηση φίλτρων
    search_clear: Καθαρισμός αναζήτησης
    no_match: "Κανένα φίλτρο δεν ταιριάζει με «{query}»"
    expand_all: Άνοιγμα όλων
    collapse_all: Κλείσιμο όλων
    expand_all_label: Άνοιγμα όλων των ενοτήτων φίλτρων
    collapse_all_label: Κλείσιμο όλων των ενοτήτων φίλτρων
    clear: Καθαρισμός
    clear_all: Καθαρισμός όλων
    apply: Εφαρμογή
    show_results: Εμφάνιση αποτελεσμάτων
    active_count: "{count} ενεργά φίλτρα"
en:
  filters:
    title: Filters
    description: Filter the products
    price: Price
    popularity: Popularity
    view_count: Views
    categories: Categories
    brands: Brands
    attributes: Attributes
    availability: Availability
    search_label: Search the filters
    search_placeholder: Search filters
    search_clear: Clear search
    no_match: 'No filter matches "{query}"'
    expand_all: Expand all
    collapse_all: Collapse all
    expand_all_label: Expand all filter sections
    collapse_all_label: Collapse all filter sections
    clear: Clear
    clear_all: Clear all
    apply: Apply
    show_results: Show results
    active_count: "{count} active filters"
</i18n>

<style scoped>
/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .products-sidebar {
    transition: none;
  }

  :deep(.transition-all),
  :deep(.transition-transform),
  :deep(.transition-colors) {
    transition: none;
  }
}
</style>
