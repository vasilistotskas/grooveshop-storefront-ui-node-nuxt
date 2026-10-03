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
 * Sections: the category tree, the price, then one per attribute — each
 * open until a shopper folds it.
 */
import type { AccordionItem } from '@nuxt/ui'
import type { AttributeGroup } from '~/utils/attributeGroups'

defineOptions({
  inheritAttrs: false,
})

defineProps<{
  /** How many products the filters leave, for the drawer's button. */
  totalResults: number
}>()

const attrs = useAttrs()
const { t, locale } = useI18n()
const { filters, activeFilterChips, updateFilters } = useProductFilters()
const {
  allAttributes,
  allAttributeValues,
  attributeValueFacets,
  priceStats,
  isPriceStatsLoaded,
} = useProductSearchData(useListingScope())
const { forest } = useCategoryForest()

const drawerOpen = ref(false)

// One definition of the controls, rendered in both frames.
const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

const attributeGroups = computed(() => buildAttributeGroups(
  allAttributes.value?.results ?? [],
  allAttributeValues.value?.results ?? [],
  attributeValueFacets.value,
  filters.value.attributeValues,
  locale.value,
))

// One member per slot, so each slot's `item` is typed by its own shape.
type SectionItem
  = | (AccordionItem & { value: string, slot: 'category' })
    | (AccordionItem & { value: string, slot: 'price' })
    | (AccordionItem & { value: string, slot: 'attribute', group: AttributeGroup })

const sections = computed<SectionItem[]>(() => [
  ...(forest.value.length ? [{ label: t('category'), value: 'category', slot: 'category' as const }] : []),
  // The slider needs a range to slide over: a listing whose products all
  // cost the same has none.
  ...(isPriceStatsLoaded.value && priceStats.value.min !== priceStats.value.max
    ? [{ label: t('price'), value: 'price', slot: 'price' as const }]
    : []),
  ...attributeGroups.value.map(group => ({
    label: group.label,
    value: `attribute-${group.id}`,
    slot: 'attribute' as const,
    group,
  })),
])

// Every section starts open, a section that appears later (attributes
// arriving with the data) included: what is stored is what was folded.
const folded = ref<string[]>([])
const openSections = computed({
  get: () => sections.value.map(section => section.value).filter(value => !folded.value.includes(value)),
  set: (open: string[]) => {
    folded.value = sections.value.map(section => section.value).filter(value => !open.includes(value))
  },
})

const accordionUi = {
  item: 'border-b border-default',
  trigger: 'py-4.5 text-[0.9375rem] font-bold text-highlighted',
  trailingIcon: 'size-4 text-highlighted',
  content: 'pb-4.5',
}

const hasFilters = computed(() => activeFilterChips.value.some(isFilterChip))

function toggleDrawer() {
  drawerOpen.value = !drawerOpen.value
}

defineExpose({
  toggleDrawer,
})
</script>

<template>
  <DefineFiltersTemplate>
    <UAccordion
      v-model="openSections"
      type="multiple"
      :items="sections"
      :ui="accordionUi"
    >
      <template #category>
        <ProductsFiltersCategoryTree />
      </template>
      <template #price>
        <ProductsFiltersPriceRange />
      </template>
      <template #attribute="{ item }">
        <ProductsFiltersAttributeValues :group="item.group" />
      </template>
    </UAccordion>
  </DefineFiltersTemplate>

  <!-- Wide screens: a column that follows the grid down the page. -->
  <aside
    v-bind="attrs"
    :aria-label="t('title')"
    class="hidden lg:block"
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
  description: Περιορίστε τα προϊόντα κατά κατηγορία, τιμή και χαρακτηριστικά
  category: Κατηγορία
  price: Τιμή
  clear: Καθαρισμός
  show_results: 'Δείτε {count} προϊόν | Δείτε {count} προϊόντα'
en:
  title: Filters
  description: Narrow the products by category, price and attributes
  category: Category
  price: Price
  clear: Clear
  show_results: 'Show {count} product | Show {count} products'
</i18n>
