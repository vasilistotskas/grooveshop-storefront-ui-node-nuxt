<script lang="ts" setup>
import { createReusableTemplate } from '@vueuse/core'

const { locale, t } = useI18n()
const route = useRoute()
const { $i18n } = useNuxtApp()
const { isMobileOrTablet } = useDevice()

const { data: categories, status } = await useFetch(
  '/api/products/categories',
  {
    key: 'productCategories',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      languageCode: locale,
    },
  },
)

const sidebar = ref(null)
const searchQuery = ref('')
const categoriesOpen = ref(true)
const drawerOpen = ref(false)

const selectedCategoryIds = computed(() => {
  return route.query.category ? route.query.category.toString().split('_') : []
})

const filteredCategories = computed(() => {
  return categories.value?.results
    ?.slice()
    .sort((a, b) => {
      const aIsSelected = selectedCategoryIds.value.includes(a.id.toString())
      const bIsSelected = selectedCategoryIds.value.includes(b.id.toString())
      if (aIsSelected && !bIsSelected) {
        return -1
      }
      else if (!aIsSelected && bIsSelected) {
        return 1
      }
      return 0
    })
    .filter((category) => {
      return extractTranslated(category, 'name', locale.value)
        ?.toLowerCase()
        .includes(searchQuery.value.toLowerCase())
    })
})

const hasActiveFilters = computed(() => selectedCategoryIds.value.length > 0)

const [DefineFiltersTemplate, ReuseFiltersTemplate] = createReusableTemplate()

function clearFilters() {
  navigateTo({ query: {} })
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
      <UCollapsible
        v-model:open="categoriesOpen"
        class="space-y-3"
      >
        <button
          class="
            group flex w-full items-center justify-between text-left
            focus:outline-none
          "
        >
          <div class="flex items-center gap-2">
            <UIcon
              name="i-lucide-folder"
              class="
                size-5 text-gray-500
                dark:text-gray-400
              "
            />
            <span
              class="
                font-medium text-gray-900
                dark:text-white
              "
            >
              {{ $i18n.t('categories') }}
            </span>
            <UBadge
              variant="soft"
              color="primary"
              size="sm"
            >
              {{ categories?.count ?? 0 }}
            </UBadge>
          </div>
          <UIcon
            name="i-lucide-chevron-down"
            class="
              size-5 text-gray-500 transition-transform duration-200
              group-data-[state=open]:rotate-180
              dark:text-gray-400
            "
          />
        </button>

        <template #content>
          <div class="space-y-3">
            <UInput
              v-model="searchQuery"
              icon="i-lucide-search"
              color="neutral"
              variant="outline"
              size="md"
              :placeholder="`${$i18n.t('search.title')}...`"
            >
              <template
                v-if="searchQuery"
                #trailing
              >
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="xs"
                  @click="searchQuery = ''"
                />
              </template>
            </UInput>

            <div
              class="
                max-h-96 space-y-2 overflow-y-auto
                lg:max-h-96
              "
            >
              <template v-if="status === 'pending'">
                <div
                  v-for="index in 6"
                  :key="index"
                  class="flex items-center gap-3 p-2"
                >
                  <USkeleton
                    class="size-12"
                    :ui="{ rounded: 'rounded-lg' }"
                  />
                  <USkeleton class="h-5 flex-1" />
                </div>
              </template>

              <template v-else-if="filteredCategories?.length">
                <ProductsSidebarCategory
                  v-for="category in filteredCategories"
                  :key="category.id"
                  :category="category"
                />
              </template>

              <template v-else>
                <div class="py-8 text-center">
                  <UIcon
                    name="i-lucide-search-x"
                    class="
                      mx-auto size-12 text-gray-300
                      dark:text-gray-600
                    "
                  />
                  <p
                    class="
                      mt-2 text-sm text-gray-500
                      dark:text-gray-400
                    "
                  >
                    {{ t('categories.not_found') }}
                  </p>
                </div>
              </template>
            </div>
          </div>
        </template>
      </UCollapsible>

      <div
        v-if="hasActiveFilters"
        class="
          flex items-center justify-between border-t border-gray-200 pt-4
          dark:border-gray-700
        "
      >
        <span
          class="
            flex items-center gap-2 text-sm text-gray-600
            dark:text-gray-400
          "
        >
          <span>
            {{ selectedCategoryIds.length }}
          </span>
          <span>
            {{ $i18n.t('filters.active') }}
          </span>
        </span>
        <UButton
          color="neutral"
          variant="ghost"
          size="xs"
          trailing-icon="i-lucide-x"
          @click="clearFilters"
        >
          {{ $i18n.t('filters.clear') }}
        </UButton>
      </div>
    </div>
  </DefineFiltersTemplate>

  <template v-if="isMobileOrTablet && categories && categories.count > 0">
    <UButton
      v-if="hasActiveFilters"
      color="neutral"
      icon="i-lucide-x"
      class="
        fixed right-6 bottom-32 z-40 shadow-lg
        lg:hidden
      "
      @click="clearFilters"
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
        icon="i-lucide-filter"
        class="
          fixed right-6 bottom-20 z-40 shadow-lg
          lg:hidden
        "
      >
        <template v-if="hasActiveFilters">
          <UChip
            :text="selectedCategoryIds.length"
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
            name="i-lucide-filter"
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
    v-else-if="!isMobileOrTablet && categories && categories.count > 0"
    ref="sidebar"
    class="relative h-fit w-64 transition-all duration-300 ease-in-out"
  >
    <UCard
      class="w-full"
      :ui="{
        body: 'sm:p-4 space-y-4',
        header: 'sm:p-4 space-y-4',
      }"
    >
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon
            name="i-lucide-filter"
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
