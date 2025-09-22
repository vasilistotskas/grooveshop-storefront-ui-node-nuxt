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
const { t, locale } = useI18n()
const { $i18n } = useNuxtApp()
const { loggedIn, user } = useUserSession()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore

const pageSize = ref(8)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-availability_priority,id')
const category = computed(() => route.query.category)

const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'finalPrice',
    label: t('ordering.price'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'createdAt',
    label: $i18n.t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const {
  data: products,
  status,
  refresh,
} = await useFetch(
  '/api/products',
  {
    key: `products-${ordering.value}-${page.value}-${category.value}-${pageSize.value}-${paginationType.value}-${locale.value}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      ordering: ordering,
      category: category,
      pageSize: pageSize,
      paginationType: paginationType,
      language: locale,
    },
  },
)

const productIds = computed(() => {
  if (!products.value) return []
  return products.value.results?.map(product => product.id)
})

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value && productIds.value && productIds.value.length > 0
})

if (shouldFetchFavouriteProducts.value) {
  await useLazyFetch('/api/products/favourites/favourites-by-products', {
    key: `favouritesByProducts${user.value?.id}`,
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      productIds: productIds,
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const favourites = response._data
      if (favourites) {
        updateFavouriteProducts(favourites)
      }
    },
  })
}

const refreshFavouriteProducts = async (ids: number[]) => {
  if (!shouldFetchFavouriteProducts.value) return
  return await $fetch('/api/products/favourites/favourites-by-products', {
    method: 'POST',
    headers: useRequestHeaders(),
    body: {
      productIds: ids,
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      const favourites = response._data
      if (favourites) {
        updateFavouriteProducts(favourites)
      }
    },
  })
}

const pagination = computed(() => {
  if (!products.value?.count) return
  return usePagination<Product>(products.value)
})

const orderingOptions = computed(() => {
  return useOrdering(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    await refresh()
    if (loggedIn.value && productIds.value && productIds.value.length > 0) {
      await refreshFavouriteProducts(productIds.value)
    }
  },
)
</script>

<template>
  <div class="products-list flex w-full flex-col gap-4">
    <div class="flex flex-row flex-wrap items-center gap-2">
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
      <Ordering
        :ordering="String(ordering)"
        :ordering-options="orderingOptions.orderingOptionsArray.value"
      />
    </div>
    <ol
      v-if="!(status === 'pending') && products?.count"
      class="
        grid grid-cols-1 items-center justify-center gap-4
        sm:grid-cols-2
        md:grid-cols-3
        lg:grid-cols-3
        xl:grid-cols-4
      "
    >
      <ProductCard
        v-for="(product, index) in products?.results"
        :key="index"
        :img-loading="index > 7 ? 'lazy' : 'eager'"
        :product="product"
      />
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
        class="h-[300px] w-full"
      />
    </div>
  </div>
</template>
