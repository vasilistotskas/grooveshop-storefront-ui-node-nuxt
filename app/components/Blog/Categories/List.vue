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
const { locale, t } = useI18n({ useScope: 'local' })

const pageSize = ref(8)

const page = computed(() => route.query.page)
const skeletonHeight = computed(() => (isMobileOrTablet ? '386px' : '357px'))

const {
  data: categories,
  status,
  refresh,
} = await useFetch<Pagination<BlogCategory>>(
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
  if (!categories.value) return
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
      <LazyPagination
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
      v-if="!(status === 'pending') && categories?.results?.length"
      class="
        grid grid-cols-1 items-center justify-center gap-4

        lg:grid-cols-3

        md:grid-cols-3

        sm:grid-cols-2

        xl:grid-cols-4
      "
    >
      <UCard
        v-for="(category, index) in categories?.results"
        :key="index"
        class="grid h-full"
      >
        <Anchor
          v-if="category.absoluteUrl"
          class="grid h-full items-center justify-center"
          :to="{ path: category.absoluteUrl }"
          :text="extractTranslated(category, 'name', locale)"
        >
          <div class="grid h-full">
            <h2
              class="
                text-center text-secondary text-xl font-semibold tracking-tight

                dark:text-secondary-dark

                md:text-2xl
              "
            >
              {{ extractTranslated(category, 'name', locale) }}
            </h2>
            <ImgWithFallback
              provider="mediaStream"
              class="max-h-[19.75rem] bg-primary-100 bg-transparent"
              :style="{
                contentVisibility: 'auto',
                filter: 'invert(40%) sepia(85%) saturate(7500%) hue-rotate(220deg) brightness(105%) contrast(120%)',
                objectFit: 'none',
              }"
              :src="category.mainImagePath"
              :width="368"
              :height="294"
              fit="contain"
              :format="'svg'"
              :background="'transparent'"
              :alt="extractTranslated(category, 'name', locale)"
              :modifiers="{ position: 'attention' }"
            />
            <div class="grid items-end">
              <span
                class="
                  block w-full text-center font-semibold text-secondary

                  dark:text-secondary-dark
                "
              >
                {{
                  t('discover.more', category.recursivePostCount)
                }}
              </span>
            </div>
          </div>
        </Anchor>
      </UCard>
    </ol>
    <template v-if="status === 'pending'">
      <ClientOnlyFallback
        class="
          grid grid-cols-1 items-center justify-center gap-4

          lg:grid-cols-3

          md:grid-cols-3

          sm:grid-cols-2

          xl:grid-cols-4
        "
        :count="categories?.results?.length || 4"
        :height="skeletonHeight"
        width="100%"
      />
    </template>
  </div>
</template>

<i18n lang="yaml">
el:
  discover:
    more: Κανένα Άρθρο | Ανακάλυψε 1 Άρθρο | Ανακάλυψε και τα {count} Άρθρα
</i18n>
