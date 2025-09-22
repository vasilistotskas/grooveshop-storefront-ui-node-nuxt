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
const { isMobileOrTablet } = useDevice()
const { blogCategoryUrl } = useUrls()
const { locale, t } = useI18n()

const pageSize = ref(8)

const page = computed(() => route.query.page)

const {
  data: categories,
  status,
  refresh,
} = await useFetch(
  '/api/blog/categories',
  {
    key: 'blogCategories',
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      pageSize: pageSize,
      paginationType: paginationType,
      language: locale,
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
  <div class="categories-list flex w-full flex-col gap-4">
    <div class="flex flex-row flex-wrap items-center">
      <Pagination
        v-if="pagination"
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
    <ol
      v-if="!(status === 'pending') && categories?.count"
      class="
        grid grid-cols-2 items-center justify-center gap-4
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      <UCard
        v-for="(category, index) in categories?.results"
        :key="index"
        class="grid h-full"
      >
        <Anchor
          v-if="category.slug"
          class="grid h-full items-center justify-center"
          :to="{ path: blogCategoryUrl(category) }"
          :text="extractTranslated(category, 'name', locale)"
        >
          <div class="grid h-full">
            <h2
              class="
                text-center text-xl font-semibold tracking-tight
                md:text-2xl
              "
            >
              {{ extractTranslated(category, 'name', locale) }}
            </h2>
            <ImgWithFallback
              class="max-h-[19.75rem] bg-transparent"
              :style="{
                contentVisibility: 'auto',
                filter: 'invert(40%) sepia(85%) saturate(7500%) hue-rotate(220deg) brightness(105%) contrast(120%)',
                objectFit: isMobileOrTablet ? 'scale-down' : 'none',
              }"
              :src="category.mainImagePath"
              :width="200"
              :height="200"
              fit="contain"
              :format="'svg'"
              :background="'transparent'"
              :alt="extractTranslated(category, 'name', locale)"
              :modifiers="{ position: 'attention' }"
            />
            <div class="grid items-end">
              <span
                class="block w-full text-center font-semibold"
              >
                {{
                  t('discover.more', category.postCount || 0)
                }}
              </span>
            </div>
          </div>
        </Anchor>
      </UCard>
    </ol>
    <div
      v-if="status === 'pending'"
      class="
        grid grid-cols-1 items-center justify-center gap-4
        md:grid-cols-3
        lg:grid-cols-3
      "
    >
      <USkeleton
        v-for="i in 6"
        :key="i"
        class="h-[200px] w-full"
      />
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  discover:
    more: Κανένα Άρθρο | Ανακάλυψε 1 Άρθρο | Ανακάλυψε και τα {count} Άρθρα
</i18n>
