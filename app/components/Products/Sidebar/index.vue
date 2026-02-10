<script lang="ts" setup>
/**
 * Products Sidebar Component
 *
 * A modern, responsive filter sidebar for the product listing page.
 * Uses UAccordion for collapsible filter sections and USlideover for mobile.
 *
 * Features:
 * - Accordion-based filter sections with smooth animations
 * - Responsive: Slideover on mobile/tablet, sticky sidebar on desktop
 * - Active filter count badges per section
 * - Clear all filters functionality
 * - Accessible with proper ARIA labels and keyboard navigation
 * - Reduced motion support
 *
 * @component
 */
import type { AccordionItem } from '@nuxt/ui'
import { createReusableTemplate } from '@vueuse/core'

defineOptions({
  inheritAttrs: false,
})

const attrs = useAttrs()
const { t } = useI18n()
const { isMobileOrTablet } = useDevice()
const { hasActiveFilters, activeFilterCount, clearFilters, filterCountBySection } = useProductFilters()

const sidebar = ref<HTMLElement | null>(null)
const slideoverOpen = ref(false)

// Reusable template for filter content (shared between mobile and desktop)
const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

// Accordion items configuration - using slot property for custom body content
const accordionItems = computed<AccordionItem[]>(() => [
  {
    label: `${t('filters.price')}${filterCountBySection.value.price > 0 ? ` (${filterCountBySection.value.price})` : ''}`,
    icon: 'i-heroicons-currency-euro',
    value: 'price',
    slot: 'price' as const,
  },
  {
    label: `${t('filters.popularity')}${filterCountBySection.value.popularity > 0 ? ` (${filterCountBySection.value.popularity})` : ''}`,
    icon: 'i-heroicons-heart',
    value: 'popularity',
    slot: 'popularity' as const,
  },
  {
    label: `${t('filters.view_count')}${filterCountBySection.value.viewCount > 0 ? ` (${filterCountBySection.value.viewCount})` : ''}`,
    icon: 'i-heroicons-eye',
    value: 'views',
    slot: 'views' as const,
  },
  {
    label: `${t('filters.categories')}${filterCountBySection.value.categories > 0 ? ` (${filterCountBySection.value.categories})` : ''}`,
    icon: 'i-heroicons-folder',
    value: 'categories',
    slot: 'categories' as const,
  },
  {
    label: `${t('filters.attributes')}${filterCountBySection.value.attributes > 0 ? ` (${filterCountBySection.value.attributes})` : ''}`,
    icon: 'i-heroicons-tag',
    value: 'attributes',
    slot: 'attributes' as const,
  },
])

// Default open sections
const defaultOpenSections = ['price', 'categories']

function handleClearFilters() {
  clearFilters()
  if (isMobileOrTablet) {
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
  if (isOpen && isMobileOrTablet) {
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
      <!-- Search Input - Always visible at top -->
      <div class="space-y-2 pb-4">
        <ProductsFiltersSearchInput />
      </div>

      <USeparator />

      <!-- Accordion Filter Sections -->
      <UAccordion
        type="multiple"
        :default-value="defaultOpenSections"
        :items="accordionItems"
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
          <ProductsFiltersPriceRange />
        </template>

        <!-- Popularity Filter -->
        <template #popularity>
          <ProductsFiltersPopularityFilter />
        </template>

        <!-- View Count Filter -->
        <template #views>
          <ProductsFiltersViewCountFilter />
        </template>

        <!-- Categories Filter -->
        <template #categories>
          <ProductsFiltersCategoryFilter />
        </template>

        <!-- Attributes Filter -->
        <template #attributes>
          <ProductsFiltersAttributeFilter />
        </template>
      </UAccordion>

      <USeparator v-if="hasActiveFilters" />

      <!-- Active Filters Summary -->
      <ProductsFiltersActiveFilters />
    </div>
  </DefineFiltersTemplate>

  <!-- Mobile/Tablet: Slideover -->
  <template v-if="isMobileOrTablet">
    <!-- Floating Action Buttons -->
    <div class="fixed right-4 bottom-20 z-40 flex flex-col gap-3 lg:hidden">
      <!-- Clear Filters FAB -->
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 scale-75 translate-y-4"
        enter-to-class="opacity-100 scale-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 scale-100 translate-y-0"
        leave-to-class="opacity-0 scale-75 translate-y-4"
      >
        <UButton
          v-if="hasActiveFilters"
          color="neutral"
          variant="solid"
          icon="i-heroicons-x-mark"
          size="lg"
          class="shadow-lg hover:shadow-xl"
          :aria-label="t('filters.clear_all')"
          @click="handleClearFilters"
        >
          <UChip
            :text="activeFilterCount"
            color="error"
            size="md"
          />
        </UButton>
      </Transition>

      <!-- Open Filters FAB -->
      <UButton
        color="primary"
        size="xl"
        icon="i-heroicons-funnel"
        class="shadow-lg hover:shadow-xl"
        :aria-label="t('filters.title')"
        @click="slideoverOpen = true"
      >
        <UChip
          v-if="hasActiveFilters"
          :text="activeFilterCount"
          color="neutral"
          size="lg"
        >
          {{ t('filters.title') }}
        </UChip>
        <template v-else>
          {{ t('filters.title') }}
        </template>
      </UButton>
    </div>

    <!-- Slideover Panel -->
    <USlideover
      v-model:open="slideoverOpen"
      side="right"
      :title="t('filters.title')"
      :description="hasActiveFilters ? t('filters.active_count', { count: activeFilterCount }) : t('filters.description')"
      :ui="{
        content: 'w-full max-w-sm',
        body: 'overflow-y-auto p-4',
        footer: `
          border-t border-neutral-200 p-4
          dark:border-neutral-800
        `,
      }"
    >
      <!-- Hidden trigger (we use FAB instead) -->
      <template #default />

      <template #body>
        <ReuseFiltersTemplate />
      </template>

      <template #footer>
        <div class="flex flex-col gap-3">
          <UButton
            color="primary"
            size="lg"
            block
            icon="i-heroicons-check"
            :aria-label="t('filters.apply')"
            @click="slideoverOpen = false"
          >
            {{ t('filters.show_results') }}
          </UButton>
          <UButton
            v-if="hasActiveFilters"
            color="neutral"
            variant="ghost"
            size="md"
            block
            icon="i-heroicons-x-mark"
            :aria-label="t('filters.clear_all')"
            @click="handleClearFilters"
          >
            {{ t('filters.clear_all') }}
          </UButton>
        </div>
      </template>
    </USlideover>
  </template>

  <!-- Desktop: Sticky Sidebar -->
  <aside
    v-else
    ref="sidebar"
    v-bind="attrs"
    class="
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
                class="text-xs text-neutral-500 dark:text-neutral-300"
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
  </aside>
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
    apply: Εφαρμογή
    show_results: Εμφάνιση αποτελεσμάτων
    active_count: "{count} ενεργά φίλτρα"
</i18n>

<style scoped>
/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  aside {
    transition: none;
  }

  :deep(.transition-all),
  :deep(.transition-transform),
  :deep(.transition-colors) {
    transition: none;
  }
}
</style>
