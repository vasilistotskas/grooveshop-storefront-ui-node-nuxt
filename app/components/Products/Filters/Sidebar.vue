<script setup lang="ts">
import { createReusableTemplate } from '@vueuse/core'

const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

const { activeFilterCount, hasActiveFilters, clearFilters } = useProductFilters()

// Responsive breakpoint detection
const breakpoints = useBreakpoints({
  mobile: 0,
  tablet: 768,
  desktop: 1024,
})

const isMobileOrTablet = breakpoints.smaller('desktop')

// Drawer state for mobile
const drawerOpen = ref(false)

// Sidebar ref for desktop
const sidebar = ref<HTMLElement>()
</script>

<template>
  <!-- Define reusable template for filter content -->
  <DefineFiltersTemplate>
    <div class="space-y-4">
      <ProductsFiltersSearchInput />
      <ProductsFiltersPriceRange />
      <ProductsFiltersPopularityFilter />
      <ProductsFiltersViewCountFilter />
      <ProductsFiltersCategoryFilter />
      <ProductsFiltersActiveFilters />
    </div>
  </DefineFiltersTemplate>

  <!-- Mobile: Drawer -->
  <UDrawer v-if="isMobileOrTablet" v-model:open="drawerOpen">
    <template #trigger>
      <UButton
        icon="i-heroicons-funnel"
        size="md"
        :aria-label="$t('filters.title')"
      >
        {{ $t('filters.title') }}
        <UBadge v-if="activeFilterCount" variant="soft" size="sm" class="ml-2">
          {{ activeFilterCount }}
        </UBadge>
      </UButton>
    </template>

    <template #header>
      <div class="flex items-center justify-between">
        <h2 class="text-lg font-semibold">
          {{ $t('filters.title') }}
        </h2>
        <UButton
          v-if="hasActiveFilters"
          variant="ghost"
          size="xs"
          @click="clearFilters"
        >
          {{ $t('filters.clear_all') }}
        </UButton>
      </div>
    </template>

    <ReuseFiltersTemplate />
  </UDrawer>

  <!-- Desktop: Sidebar -->
  <div v-else ref="sidebar" class="sticky top-4">
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-semibold">
            {{ $t('filters.title') }}
          </h2>
          <UButton
            v-if="hasActiveFilters"
            variant="ghost"
            size="xs"
            @click="clearFilters"
          >
            {{ $t('filters.clear_all') }}
          </UButton>
        </div>
      </template>

      <ReuseFiltersTemplate />
    </UCard>
  </div>
</template>
