<script lang="ts" setup>
import type { Ref } from 'vue'

import type { EntityOrdering, OrderingOption } from '~/types/ordering'
import type { Product, ProductOrderingField } from '~/types/product/product'

import emptyIcon from '~icons/mdi/package-variant-remove'

const route = useRoute()
const { t } = useI18n()

const limit = computed(() => route.query.limit)
const offset = computed(() => route.query.offset)
const ordering = computed(() => route.query.ordering || '-createdAt')
const category = computed(() => route.query.category)

const entityOrdering: Ref<EntityOrdering<ProductOrderingField>> = ref([
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

const orderingFields: Partial<Record<ProductOrderingField, OrderingOption[]>> =
  reactive({
    finalPrice: [],
    createdAt: [],
  })

const {
  data: products,
  pending,
  refresh,
} = await useLazyAsyncData('products', () =>
  $fetch('/api/products', {
    method: 'GET',
    query: {
      limit: limit.value,
      offset: offset.value,
      ordering: ordering.value,
      category: category.value,
    },
  }),
)

const pagination = computed(() => {
  if (!products.value) return
  return usePagination<Product>(products.value)
})

const orderingOptions = computed(() => {
  return useOrdering<ProductOrderingField>(entityOrdering.value, orderingFields)
})

watch(
  () => route.query,
  () => refresh(),
  { deep: true },
)
</script>

<template>
  <div class="products-list grid w-full gap-4">
    <div class="flex flex-row items-center gap-2">
      <PaginationLimitOffset
        v-if="pagination"
        :page="pagination.page"
        :limit="pagination.limit"
        :offset="pagination.offset"
        :total-pages="pagination.totalPages"
        :page-total-results="pagination.pageTotalResults"
      />
      <Ordering
        :ordering="String(ordering)"
        :ordering-options="orderingOptions.orderingOptionsArray.value"
      />
    </div>
    <ol
      class="grid grid-cols-1 justify-center gap-4"
      :class="{
        'items-center sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4':
          pending || products?.results?.length,
        'items-start': !pending && !products?.results?.length,
      }"
    >
      <template v-if="!pending && products?.results?.length">
        <ProductCard
          v-for="(product, index) in products?.results"
          :key="index"
          :product="product"
          :img-loading="index > 7 ? 'lazy' : 'eager'"
        />
      </template>
      <template v-if="pending">
        <ClientOnlyFallback
          v-for="index in 8"
          :key="index"
          height="402px"
          width="100%"
        />
      </template>
      <EmptyState
        v-if="!pending && !products?.results?.length"
        :icon="emptyIcon"
      >
        <template #actions>
          <UButton
            :label="$t('common.empty.button')"
            :to="'index'"
            color="white"
          />
        </template>
      </EmptyState>
    </ol>
  </div>
</template>
