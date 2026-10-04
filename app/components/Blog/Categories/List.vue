<script lang="ts" setup>
const props = defineProps({
  paginationType: {
    type: String as PropType<PaginationType>,
    required: false,
    default: PaginationTypeEnum.PAGE_NUMBER,
    validator: (value: string) =>
      Object.values(PaginationTypeEnum).includes(value as PaginationTypeEnum),
  },
})

const { paginationType } = toRefs(props)

const route = useRoute()
const { blogCategoryUrl } = useUrls()
const { locale, t } = useI18n()
const localePath = useLocalePath()

const pageSize = ref(9)

const page = computed(() => route.query.page)

const {
  data: categories,
  status,
  refresh,
} = await useApi(
  '/api/blog/categories',
  {
    key: 'blogCategories',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      pageSize: pageSize,
      paginationType: paginationType,
      languageCode: locale,
    },
  },
)

const pagination = computed(() => {
  if (!categories.value?.count) return
  return usePagination<BlogCategory>(categories.value)
})

watch(
  () => route.query,
  async () => {
    await refresh()
  },
)
</script>

<template>
  <div class="flex w-full flex-col gap-8">
    <ol
      v-if="status !== 'pending' && categories?.count"
      class="
        grid grid-cols-1 gap-4
        sm:grid-cols-2
        lg:grid-cols-3 lg:gap-6
      "
    >
      <li
        v-for="category in categories.results"
        :key="category.id"
        class="
          group relative flex flex-col overflow-hidden rounded-[1.25rem]
          bg-default ring ring-default
        "
      >
        <div class="aspect-4/3 overflow-hidden bg-elevated">
          <ImgWithFallback
            :src="category.mainImagePath"
            :width="640"
            :height="480"
            fit="cover"
            :modifiers="{ position: 'attention' }"
            :alt="extractTranslated(category, 'name', locale) ?? ''"
            class="
              size-full object-cover transition-transform duration-300
              group-hover:scale-105
            "
          />
        </div>
        <div class="flex flex-col gap-1 p-5">
          <h2 class="font-display text-xl font-bold text-highlighted">
            <NuxtLink
              v-if="category.slug"
              :to="localePath(blogCategoryUrl(category))"
              class="
                after:absolute after:inset-0 after:rounded-[1.25rem]
                focus-visible:outline-none
                focus-visible:after:ring-2 focus-visible:after:ring-secondary
              "
            >
              {{ extractTranslated(category, 'name', locale) }}
            </NuxtLink>
            <template v-else>
              {{ extractTranslated(category, 'name', locale) }}
            </template>
          </h2>
          <p class="text-sm text-toned">
            {{ t('discover.more', category.postCount || 0) }}
          </p>
        </div>
      </li>
    </ol>
    <div
      v-if="status === 'pending'"
      class="
        grid grid-cols-1 gap-4
        sm:grid-cols-2
        lg:grid-cols-3 lg:gap-6
      "
    >
      <USkeleton
        v-for="i in 6"
        :key="i"
        class="h-64 w-full rounded-[1.25rem]"
      />
    </div>
    <div
      v-if="pagination"
      class="flex justify-center"
    >
      <Pagination
        :count="pagination.count"
        :links="pagination.links"
        :loading="status === 'pending'"
        :page="pagination.page"
        :page-size="pagination.pageSize"
        :page-total-results="pagination.pageTotalResults"
        :pagination-type="paginationType"
        :total-pages="pagination.totalPages"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  discover:
    more: Κανένα άρθρο | Δες το 1 άρθρο | Δες και τα {count} άρθρα
en:
  discover:
    more: No articles | See 1 article | See all {count} articles
</i18n>
