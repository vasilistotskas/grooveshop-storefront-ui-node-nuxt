<script lang="ts" setup>
import { createReusableTemplate } from '@vueuse/core'

const { $i18n } = useNuxtApp()
const { isMobileOrTablet } = useDevice()
const { hasActiveFilters, activeFilterCount, clearFilters } = useProductFilters()

const sidebar = ref(null)
const drawerOpen = ref(false)

const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

function handleClearFilters() {
  clearFilters()
  if (isMobileOrTablet) {
    drawerOpen.value = false
  }
}

onMounted(() => {
  if (!sidebar.value) return
  const { onScroll } = useSticky(sidebar.value as HTMLElement, 150)
  setTimeout(() => onScroll(), 50)
})
</script>

<template>
  <DefineFiltersTemplate>
    <div class="space-y-4">
      <!-- Search Input -->
      <ProductsFiltersSearchInput />

      <!-- Price Range Filter -->
      <ProductsFiltersPriceRange />

      <!-- Popularity Filter -->
      <ProductsFiltersPopularityFilter />

      <!-- View Count Filter -->
      <ProductsFiltersViewCountFilter />

      <!-- Category Filter -->
      <ProductsFiltersCategoryFilter />

      <!-- Active Filters -->
      <ProductsFiltersActiveFilters />
    </div>
  </DefineFiltersTemplate>

  <template v-if="isMobileOrTablet">
    <UButton
      v-if="hasActiveFilters"
      color="neutral"
      icon="i-heroicons-x-mark"
      class="
        fixed right-6 bottom-32 z-40 shadow-lg
        lg:hidden
      "
      @click="handleClearFilters"
    >
      {{ $i18n.t('filters.clear_all') }}
    </UButton>

    <UDrawer
      v-model:open="drawerOpen"
      direction="bottom"
    >
      <UButton
        color="secondary"
        size="lg"
        icon="i-heroicons-funnel"
        class="
          fixed right-6 bottom-20 z-40 shadow-lg
          lg:hidden
        "
      >
        <template v-if="hasActiveFilters">
          <UChip
            :text="activeFilterCount"
            color="neutral"
            size="xl"
          >
            {{ $i18n.t('filters.title') }}
          </UChip>
        </template>
        <template v-else>
          {{ $i18n.t('filters.title') }}
        </template>
      </UButton>

      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-funnel"
            class="size-5 text-primary"
          />
          <h2
            class="
              text-lg font-semibold text-gray-900
              dark:text-white
            "
          >
            {{ $i18n.t('filters.title') }}
          </h2>
        </div>
      </template>

      <template #body>
        <ReuseFiltersTemplate />
      </template>

      <template #footer>
        <UButton
          color="primary"
          size="lg"
          block
          @click="drawerOpen = false"
        >
          {{ $i18n.t('filters.apply') }}
        </UButton>
      </template>
    </UDrawer>
  </template>

  <aside
    v-else-if="!isMobileOrTablet"
    ref="sidebar"
    class="relative h-fit w-64 transition-all duration-300 ease-in-out"
  >
    <UCard
      class="w-full"
      :ui="{
        body: `
          space-y-4
          sm:p-4
        `,
        header: `
          space-y-4
          sm:p-4
        `,
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-heroicons-funnel"
            class="size-5 text-primary"
          />
          <h2
            class="
              text-lg font-semibold text-gray-900
              dark:text-white
            "
          >
            {{ $i18n.t('filters.title') }}
          </h2>
        </div>
      </template>

      <ReuseFiltersTemplate />
    </UCard>
  </aside>
</template>

<i18n lang="yaml">
el:
  categories:
    not_found: Δεν βρέθηκαν Κατηγορίες
</i18n>
