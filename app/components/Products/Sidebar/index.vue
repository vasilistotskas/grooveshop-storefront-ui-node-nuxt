<script lang="ts" setup>
/**
 * The product filters.
 *
 * One set of controls, two frames: a column beside the grid on a wide
 * screen, and a drawer from the bottom on a narrow one. The frames are
 * chosen by CSS, not by the User-Agent — a desktop browser at 500px
 * wide is a narrow screen, and the UA split meant the drawer did not
 * exist there at all, so the filter button toggled nothing.
 *
 * Filtering applies immediately in both: the URL is the filter state,
 * so an "apply" step would only add a way to lose it. The drawer's
 * footer closes it on the results it has already changed, and says how
 * many there are.
 *
 * Sections: the category tree, the price, the brands, then one per
 * attribute, then the availability switches — each open until a shopper folds it.
 *
 * A column of many sections gets a quick search on top (`filterSearch.ts`)
 * and, always, one button that opens or folds every section.
 */
import type { AccordionItem } from '@nuxt/ui'
import type { AttributeGroup } from '~/utils/attributeGroups'
import type { BrandOption } from '~/utils/brandOptions'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  /** How many products the filters leave, for the drawer's button. */
  totalResults: number
}>()

const attrs = useAttrs()
const { t, locale } = useStoreI18n('components/Products/Sidebar/index')
const { filters, activeListingChips, updateFilters } = useProductFilters()
const {
  allAttributes,
  allAttributeValues,
  attributeValueFacets,
  priceStats,
  isPriceStatsLoaded,
} = useProductSearchData(useListingScope())
const { allBrands, brandFacets } = useProductBrands(useListingScope())
const { forest } = useCategoryForest()

// Not before the list is here: until then a selected brand has no name to show.
const brandOptions = computed(() => allBrands.value
  ? buildBrandOptions(allBrands.value, brandFacets.value, filters.value.brands)
  : [])

const drawerOpen = ref(false)

// One definition of the controls, rendered in both frames.
const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

const attributeGroups = computed(() => buildAttributeGroups(
  allAttributes.value?.results ?? [],
  allAttributeValues.value?.results ?? [],
  attributeValueFacets.value,
  filters.value.attributeValues,
  translatorFor(locale.value),
))

// One member per slot, so each slot's `item` is typed by its own shape.
type SectionItem
  = | (AccordionItem & { value: string, slot: 'category' })
    | (AccordionItem & { value: string, slot: 'price' })
    | (AccordionItem & { value: string, slot: 'brand', options: BrandOption[] })
    | (AccordionItem & { value: string, slot: 'availability' })
    | (AccordionItem & { value: string, slot: 'attribute', group: AttributeGroup })

const sections = computed<SectionItem[]>(() => [
  ...(forest.value.length ? [{ label: t('category'), value: 'category', slot: 'category' as const }] : []),
  // The slider needs a range to slide over: a listing whose products all
  // cost the same has none.
  ...(isPriceStatsLoaded.value && priceStats.value.min !== priceStats.value.max
    ? [{ label: t('price'), value: 'price', slot: 'price' as const }]
    : []),
  ...(brandOptions.value.length
    ? [{ label: t('brand'), value: 'brand', slot: 'brand' as const, options: brandOptions.value }]
    : []),
  ...attributeGroups.value.map(group => ({
    label: group.label,
    value: `attribute-${group.id}`,
    slot: 'attribute' as const,
    group,
  })),
  { label: t('availability'), value: 'availability', slot: 'availability' as const },
])

// The quick search. Matching ignores case and accents (`foldText`). A
// section whose own label matches stays whole; a brand or attribute section
// with a matching option stays with those options (and any selected one);
// the rest drop out.
const query = ref('')
const searchOffered = computed(() => sections.value.length >= FILTER_SEARCH_MIN_SECTIONS)
const foldedQuery = computed(() => searchOffered.value ? foldText(query.value.trim()) : '')
const searching = computed(() => foldedQuery.value !== '')

const shownSections = computed<SectionItem[]>(() => {
  const needle = foldedQuery.value
  if (!needle) return sections.value
  return sections.value.flatMap((section): SectionItem[] => {
    if (labelMatches(section.label ?? '', needle)) return [section]
    if (section.slot === 'brand') {
      const options = narrowOptions(section.options, needle)
      return options ? [{ ...section, options }] : []
    }
    if (section.slot === 'attribute') {
      const options = narrowOptions(section.group.options, needle)
      return options ? [{ ...section, group: { ...section.group, options } }] : []
    }
    return []
  })
})

// Every section starts open, a section that appears later (attributes
// arriving with the data) included: what is stored is what was folded.
// While a query is set every section it leaves is open, and folding is
// not stored: the query is what a shopper is working with.
const folded = ref<string[]>([])
const openSections = computed({
  get: () => (searching.value ? shownSections.value : sections.value)
    .map(section => section.value)
    .filter(value => searching.value || !folded.value.includes(value)),
  set: (open: string[]) => {
    if (searching.value) return
    folded.value = sections.value.map(section => section.value).filter(value => !open.includes(value))
  },
})

const allOpen = computed(() => folded.value.length === 0)

function toggleAll() {
  folded.value = allOpen.value ? sections.value.map(section => section.value) : []
}

const accordionUi = {
  item: 'border-b border-default',
  trigger: 'py-4.5 text-[0.9375rem] font-bold text-highlighted',
  trailingIcon: 'size-4 text-highlighted',
  content: 'pb-4.5',
}

const hasFilters = computed(() => activeListingChips.value.some(isFilterChip))

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value
}

defineExpose({
  toggleDrawer,
})
</script>

<template>
  <DefineFiltersTemplate>
    <UInput
      v-if="searchOffered"
      v-model="query"
      icon="i-lucide-search"
      :placeholder="t('search_placeholder')"
      :aria-label="t('search_label')"
      :ui="{ trailing: 'pe-1' }"
      class="mb-2"
    >
      <template
        v-if="query.length"
        #trailing
      >
        <UButton
          color="neutral"
          variant="link"
          size="sm"
          icon="i-lucide-circle-x"
          :aria-label="t('search_clear')"
          @click="() => { query = '' }"
        />
      </template>
    </UInput>

    <div
      v-if="!searching"
      class="flex justify-end"
    >
      <UButton
        color="neutral"
        variant="link"
        size="sm"
        :icon="allOpen ? 'i-lucide-chevrons-down-up' : 'i-lucide-chevrons-up-down'"
        :label="allOpen ? t('collapse_all') : t('expand_all')"
        :aria-label="allOpen ? t('collapse_all_label') : t('expand_all_label')"
        @click="toggleAll"
      />
    </div>

    <p
      v-if="searching && !shownSections.length"
      role="status"
      class="py-6 text-center text-sm text-muted"
    >
      {{ t('no_match', { query: query.trim() }) }}
    </p>

    <UAccordion
      v-else
      v-model="openSections"
      type="multiple"
      :items="shownSections"
      :ui="accordionUi"
    >
      <template #category>
        <ProductsFiltersCategoryTree />
      </template>
      <template #price>
        <ProductsFiltersPriceRange />
      </template>
      <template #brand="{ item }">
        <ProductsFiltersBrandValues :options="item.options" />
      </template>
      <template #attribute="{ item }">
        <ProductsFiltersAttributeValues :group="item.group" />
      </template>
      <template #availability>
        <ProductsFiltersAvailability />
      </template>
    </UAccordion>
  </DefineFiltersTemplate>

  <!-- Wide screens: a column that follows the grid down the page. -->
  <aside
    v-bind="attrs"
    :aria-label="t('title')"
    class="
      hidden
      lg:sticky lg:top-[calc(var(--ui-header-height)+1.5rem)] lg:block
      lg:max-h-[calc(100dvh-var(--ui-header-height)-3rem)] lg:overflow-y-auto
      lg:ps-2 lg:pe-3 lg:[scrollbar-gutter:stable]
    "
  >
    <ReuseFiltersTemplate />
  </aside>

  <!-- Narrow screens: a drawer over the grid, opened from the toolbar.
       Rendered at every width and hidden by CSS, so it exists wherever
       the toolbar's filter button does. -->
  <UDrawer
    v-model:open="drawerOpen"
    :title="t('title')"
    :description="t('description')"
    :handle="false"
    close
    class="lg:hidden"
    :ui="{
      content: 'max-h-[96dvh]',
      container: 'min-h-0 gap-0 overflow-y-hidden p-0',
      header: 'border-b border-default py-3 ps-4 pe-2',
      title: 'font-display text-[1.375rem] font-bold',
      description: 'sr-only',
      body: 'min-h-0 overflow-y-auto px-4',
      footer: `
        grid grid-cols-[1fr_1.6fr] gap-2 border-t border-default px-4 py-3
      `,
    }"
  >
    <template #body>
      <ReuseFiltersTemplate />
    </template>

    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        class="justify-center"
        :label="t('clear')"
        :disabled="!hasFilters"
        @click="() => updateFilters(CLEARED_FILTERS)"
      />
      <UButton
        color="primary"
        class="justify-center"
        :label="t('show_results', totalResults, { named: { count: totalResults } })"
        @click="() => { drawerOpen = false }"
      />
    </template>
  </UDrawer>
</template>

<i18n lang="yaml">
el:
  title: Φίλτρα
  description: Περιορίστε τα προϊόντα κατά κατηγορία, τιμή, μάρκα, χαρακτηριστικά και διαθεσιμότητα
  category: Κατηγορία
  price: Τιμή
  brand: Μάρκα
  availability: Διαθεσιμότητα
  clear: Καθαρισμός
  show_results: 'Δείτε {count} προϊόν | Δείτε {count} προϊόντα'
  search_label: Αναζήτηση στα φίλτρα
  search_placeholder: Αναζήτηση φίλτρων
  search_clear: Καθαρισμός αναζήτησης
  no_match: 'Κανένα φίλτρο δεν ταιριάζει με «{query}»'
  expand_all: Άνοιγμα όλων
  collapse_all: Κλείσιμο όλων
  expand_all_label: Άνοιγμα όλων των ενοτήτων φίλτρων
  collapse_all_label: Κλείσιμο όλων των ενοτήτων φίλτρων
en:
  title: Filters
  description: Narrow the products by category, price, brand, attributes and availability
  category: Category
  price: Price
  brand: Brand
  availability: Availability
  clear: Clear
  show_results: 'Show {count} product | Show {count} products'
  search_label: Search the filters
  search_placeholder: Search filters
  search_clear: Clear search
  no_match: 'No filter matches "{query}"'
  expand_all: Expand all
  collapse_all: Collapse all
  expand_all_label: Expand all filter sections
  collapse_all_label: Collapse all filter sections
</i18n>
