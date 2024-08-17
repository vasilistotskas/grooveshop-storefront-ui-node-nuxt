<script lang="ts" setup>
import type { EntityOrdering } from '~/types/ordering'
import type { Product, ProductOrderingField } from '~/types/product/product'

import { type PaginationType, PaginationTypeEnum } from '~/types'

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
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore

const pageSize = ref(8)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')
const category = computed(() => route.query.category)

const entityOrdering = ref<EntityOrdering<ProductOrderingField>>([
  {
    value: 'finalPrice',
    label: t('pages.product.ordering.price'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'createdAt',
    label: t('pages.product.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

const {
  data: products,
  status,
  refresh,
} = await useAsyncData('products', () =>
  $fetch('/api/products', {
    method: 'GET',
    query: {
      page: page.value,
      ordering: ordering.value,
      category: category.value,
      pageSize: pageSize.value,
      paginationType: paginationType.value,
      language: locale.value,
    },
  }),
)

const productIds = computed(() => {
  if (!products.value) return []
  return products.value.results?.map(product => product.id)
})

const shouldFetchFavouriteProducts = computed(() => {
  return loggedIn.value && productIds.value && productIds.value.length > 0
})

await useFetch('/api/products/favourites/favourites-by-products', {
  method: 'POST',
  headers: useRequestHeaders(),
  body: {
    productIds: productIds.value,
  },
  immediate: shouldFetchFavouriteProducts.value,
  onResponse({ response }) {
    if (!response.ok) {
      return
    }
    const favourites = response._data
    updateFavouriteProducts(favourites)
  },
})

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
      updateFavouriteProducts(favourites)
    },
  })
}

const pagination = computed(() => {
  if (!products.value) return
  return usePagination<Product>(products.value)
})

const orderingOptions = computed(() => {
  return useOrdering(entityOrdering.value)
})

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      await refresh()
      if (loggedIn.value && productIds.value && productIds.value.length > 0) {
        await refreshFavouriteProducts(productIds.value)
      }
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
      :class="{
        'items-center lg:grid-cols-3 md:grid-cols-3 sm:grid-cols-2 xl:grid-cols-4':
          status === 'pending' || products?.results?.length,
        'items-start': !(status === 'pending') && !products?.results?.length,
      }"
      class="grid grid-cols-1 justify-center gap-4"
    >
      <template v-if="!(status === 'pending') && products?.results?.length">
        <ProductCard
          v-for="(product, index) in products?.results"
          :key="index"
          :img-loading="index > 7 ? 'lazy' : 'eager'"
          :product="product"
        />
      </template>
      <template v-if="status === 'pending'">
        <ClientOnlyFallback
          v-for="index in 8"
          :key="index"
          height="402px"
          width="100%"
        />
      </template>
    </ol>
  </div>
</template>
