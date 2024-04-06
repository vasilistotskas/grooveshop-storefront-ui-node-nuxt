<script lang="ts" setup>
const { locale } = useI18n()
const route = useRoute()

const { data: categories, pending } = await useLazyAsyncData(
  'blogCategories',
  () =>
    $fetch('/api/blog/categories', {
      method: 'GET',
      language: locale.value,
    }),
)

const sidebar = ref(null)
const searchQuery = ref('')
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
      } else if (!aIsSelected && bIsSelected) {
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

onMounted(() => {
  if (!sidebar.value) return
  const { onScroll } = useSticky(sidebar.value as HTMLElement, 150)
  setTimeout(() => onScroll(), 50)
})
</script>

<template>
  <aside
    v-if="categories && categories.count > 0"
    ref="sidebar"
    class="sidebar relative hidden h-fit w-60 pl-2 transition-all duration-300 ease-in-out lg:flex"
  >
    <div class="grid w-full flex-1 gap-2 overflow-y-auto pl-4 pr-4 lg:pl-0">
      <div
        class="sidebar-header-sticky bg-primary-100 dark:bg-primary-950 grid"
      >
        <h3 class="flex items-center gap-2 p-2 text-center text-lg font-bold">
          {{ $t('common.categories') }}
          <span
            class="text-primary-800 dark:text-primary-100 text-sm font-normal"
          >
            ({{ categories?.count ?? 0 }})
          </span>
        </h3>
      </div>
      <ul class="grid max-h-96 gap-2 md:gap-4">
        <template v-if="!pending && filteredCategories?.length">
          <BlogSidebarCategory
            v-for="category in filteredCategories"
            :key="category.id"
            :category="category"
          />
        </template>

        <template v-if="pending">
          <li
            v-for="index in 8"
            :key="index"
            class="flex items-center space-x-4 p-2"
          >
            <USkeleton class="h-12 w-20" :ui="{ rounded: 'rounded-full' }" />
            <USkeleton class="h-[30px] w-full" />
          </li>
        </template>
      </ul>
      <div v-if="!pending && !filteredCategories?.length" class="grid gap-4">
        <p class="text-primary-800 dark:text-primary-100 p-2 text-center">
          {{ $t('common.no_categories_found') }}
        </p>
      </div>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.sidebar {
  &.sticky {
    top: 0;
  }
}
.sidebar-header-sticky {
  position: sticky;
  top: 0;
  z-index: 10;
}
</style>
