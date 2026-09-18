<script lang="ts" setup>
/**
 * The product filters.
 *
 * One set of controls, two frames: a sticky column beside the grid on a
 * wide screen, and a drawer over it on a narrow one. The frames are
 * chosen by CSS, not by the User-Agent — a desktop browser at 500px
 * wide is a narrow screen, and the UA split meant the drawer did not
 * exist there at all, so the filter button toggled nothing.
 *
 * Filtering applies immediately on both: the URL is the filter state,
 * so an "apply" step would only add a way to lose it. The drawer's
 * footer closes it to reveal the results it has already changed.
 */
import type { AccordionItem } from '@nuxt/ui'

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const { t } = useI18n()
const {
  hasActiveFilters,
  activeFilterCount,
  clearFilters,
  filterCountBySection,
} = useProductFilters()

const slideoverOpen = ref(false)

// One definition of the controls, rendered in both frames.
const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

const accordionItems = computed<AccordionItem[]>(() => [
  {
    label: t('filters.categories'),
    icon: 'i-heroicons-folder',
    value: 'categories',
    slot: 'categories' as const,
    count: filterCountBySection.value.categories,
  },
  {
    label: t('filters.price'),
    icon: 'i-heroicons-currency-euro',
    value: 'price',
    slot: 'price' as const,
    count: filterCountBySection.value.price,
  },
  {
    label: t('filters.attributes'),
    icon: 'i-heroicons-tag',
    value: 'attributes',
    slot: 'attributes' as const,
    count: filterCountBySection.value.attributes,
  },
  {
    label: t('filters.popularity'),
    icon: 'i-heroicons-heart',
    value: 'popularity',
    slot: 'popularity' as const,
    count: filterCountBySection.value.popularity,
  },
  {
    label: t('filters.view_count'),
    icon: 'i-heroicons-eye',
    value: 'views',
    slot: 'views' as const,
    count: filterCountBySection.value.viewCount,
  },
])

/** What a shopper opens first: what it is, then what it costs. */
const defaultOpenSections = ['categories', 'price']

const accordionUi = {
  root: 'flex flex-col',
  item: 'border-b border-default last:border-b-0',
  trigger: 'cursor-pointer py-3.5 text-start font-medium text-highlighted',
  label: 'truncate',
  leadingIcon: 'size-4 text-muted',
  trailingIcon: 'size-4 text-dimmed',
  content: 'pb-4',
  body: 'pt-1',
}

function handleClearFilters() {
  clearFilters()
  slideoverOpen.value = false
}

function toggleDrawer() {
  slideoverOpen.value = !slideoverOpen.value
}

defineExpose({
  toggleDrawer,
})
</script>

<template>
  <DefineFiltersTemplate>
    <div class="flex flex-col gap-3">
      <ProductsFiltersSearchInput />

      <UAccordion
        type="multiple"
        :default-value="defaultOpenSections"
        :items="accordionItems"
        :ui="accordionUi"
      >
        <template #leading="{ item }">
          <UIcon
            :name="item.icon as string"
            class="size-4 shrink-0 text-muted"
          />
        </template>

        <!-- The count belongs beside the section's name, not inside it:
             appended to the label it was a parenthesis that truncation
             could cut off mid-number. -->
        <template #trailing="{ item, open }">
          <div class="flex items-center gap-2">
            <UBadge
              v-if="(item as { count?: number }).count"
              :label="String((item as { count?: number }).count)"
              color="secondary"
              variant="subtle"
              size="sm"
            />
            <UIcon
              name="i-heroicons-chevron-down"
              class="size-4 shrink-0 text-dimmed transition-transform"
              :class="open && 'rotate-180'"
            />
          </div>
        </template>

        <template #categories>
          <ProductsFiltersCategoryFilter />
        </template>
        <template #price>
          <ProductsFiltersPriceRange />
        </template>
        <template #attributes>
          <ProductsFiltersAttributeFilter />
        </template>
        <template #popularity>
          <ProductsFiltersPopularityFilter />
        </template>
        <template #views>
          <ProductsFiltersViewCountFilter />
        </template>
      </UAccordion>
    </div>
  </DefineFiltersTemplate>

  <!-- Wide screens: a column that follows the grid down the page. -->
  <div
    v-bind="attrs"
    role="region"
    :aria-label="t('filters.title')"
    class="
      hidden
      lg:block
    "
  >
    <UPageAside>
      <div class="flex flex-col gap-4">
        <div class="flex items-center justify-between gap-2">
          <h2 class="font-display text-base font-semibold text-highlighted">
            {{ t('filters.title') }}
          </h2>
          <UButton
            v-if="hasActiveFilters"
            color="neutral"
            variant="link"
            size="sm"
            :label="t('filters.clear')"
            class="p-0"
            @click="handleClearFilters"
          />
        </div>

        <ReuseFiltersTemplate />
      </div>
    </UPageAside>
  </div>

  <!-- Narrow screens: a drawer over the grid, opened from the toolbar.
       Rendered at every width and hidden by CSS, so it exists wherever
       the toolbar's filter button does. -->
  <USlideover
    v-model:open="slideoverOpen"
    side="left"
    :title="t('filters.title')"
    :description="t('filters.description')"
    class="lg:hidden"
    :ui="{ content: `
      w-full
      sm:max-w-sm
    `,
           body: 'p-4' }"
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
          :label="t('filters.clear_all')"
          @click="handleClearFilters"
        />
        <UButton
          class="ms-auto"
          color="secondary"
          variant="solid"
          :label="hasActiveFilters
            ? t('filters.show_results_n', { count: activeFilterCount })
            : t('filters.show_results')"
          @click="() => { slideoverOpen = false }"
        />
      </div>
    </template>
  </USlideover>
</template>

<i18n lang="yaml">
el:
  search:
    products: Αναζήτηση προϊόντων
  filters:
    title: Φίλτρα
    description: Φιλτράρετε τα προϊόντα
    price: Τιμή
    popularity: Δημοτικότητα
    view_count: Προβολές
    categories: Κατηγορίες
    attributes: Χαρακτηριστικά
    clear: Καθαρισμός
    clear_all: Καθαρισμός όλων
    show_results: Εμφάνιση αποτελεσμάτων
    show_results_n: Εμφάνιση αποτελεσμάτων ({count} φίλτρα)
en:
  search:
    products: Search products
  filters:
    title: Filters
    description: Filter the products
    price: Price
    popularity: Popularity
    view_count: Views
    categories: Categories
    attributes: Attributes
    clear: Clear
    clear_all: Clear all
    show_results: Show results
    show_results_n: Show results ({count} filters)
</i18n>
