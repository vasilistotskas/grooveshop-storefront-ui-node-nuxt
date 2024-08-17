<script lang="ts" setup>
import type { ProductFavourite, ProductFavouriteOrderingField } from '~/types/product/favourite'
import type { EntityOrdering } from '~/types/ordering'

defineProps({
  displayTotal: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const { t } = useI18n()
const route = useRoute()
const { user } = useUserSession()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore

const pageSize = ref(8)
const pending = ref(true)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<ProductFavouriteOrderingField>>([
  {
    value: 'createdAt',
    label: t('pages.account.favourites.products.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'updatedAt',
    label: t('pages.account.favourites.products.ordering.updated_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: favourites } = await useFetch(
  `/api/user/account/${user.value?.id}/favourite-products`,
  {
    method: 'GET',
    query: {
      page: page.value,
      ordering: ordering.value,
      pageSize: pageSize.value,
      expand: 'true',
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
      pending.value = false
    },
  },
)

const refreshFavourites = async () => {
  pending.value = true
  const favourites = await $fetch(
    `/api/user/account/${user.value?.id}/favourite-products`,
    {
      method: 'GET',
      query: {
        page: page.value,
        ordering: ordering.value,
        pageSize: pageSize.value,
        expand: 'true',
      },
    },
  )
  pending.value = false
  return favourites
}

const productIds = computed(() => {
  if (!favourites.value) return []
  return favourites.value.results?.map(favourite =>
    getEntityId(favourite.product) as number,
  )
})

await useFetch('/api/products/favourites/favourites-by-products', {
  method: 'POST',
  headers: useRequestHeaders(),
  body: {
    productIds: productIds.value,
  },
  immediate: productIds.value && productIds.value.length > 0,
  onResponse({ response }) {
    if (!response.ok) {
      return
    }
    const favourites = response._data
    updateFavouriteProducts(favourites)
  },
})

const refreshFavouriteProducts = async (ids: number[]) => {
  if (!productIds.value || !productIds.value.length) return
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

const onFavouriteDelete = async () => {
  favourites.value = await refreshFavourites()
}

const pagination = computed(() => {
  if (!favourites.value) return
  return usePagination<ProductFavourite>(favourites.value)
})

const orderingOptions = computed(() => {
  return useOrdering<ProductFavouriteOrderingField>(entityOrdering.value)
})

watch(
  () => route.query,
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      favourites.value = await refreshFavourites()
      if (productIds.value && productIds.value.length > 0) {
        await refreshFavouriteProducts(productIds.value)
      }
    }
  },
)
</script>

<template>
  <div class="product-favourites-list grid gap-4">
    <div class="flex flex-row flex-wrap items-center gap-2">
      <PaginationPageNumber
        v-if="pagination"
        :count="pagination.count"
        :page="pagination.page"
        :page-size="pagination.pageSize"
      />
      <Ordering
        :ordering="String(ordering)"
        :ordering-options="orderingOptions.orderingOptionsArray.value"
      />
    </div>
    <div
      v-if="favourites"
      class="grid w-full items-start gap-4"
    >
      <div
        v-if="displayTotal"
        class="flex items-center justify-center gap-1"
      >
        <span class="text-sm font-semibold text-secondary">
          {{ $t('components.favourite.list.favourites.total', favourites?.count) }}
        </span>
      </div>
      <ul
        class="
          grid grid-cols-2 gap-4

          md:grid-cols-3

          xl:grid-cols-4
        "
      >
        <template
          v-for="favourite in favourites?.results"
          :key="favourite.id"
        >
          <ProductCard
            v-if="!isEntityId(favourite.product)"
            :img-height="150"
            :img-width="260"
            :product="favourite.product"
            :show-add-to-cart-button="false"
            @favourite-delete="onFavouriteDelete"
          />
        </template>
      </ul>
    </div>
    <template v-if="pending">
      <div class="grid w-full items-start gap-4">
        <div class="flex w-full items-center justify-center">
          <ClientOnlyFallback
            class="w-full"
            height="20px"
            width="100%"
          />
        </div>
        <div
          class="
            grid grid-cols-2 gap-4

            lg:grid-cols-3

            xl:grid-cols-4
          "
        >
          <ClientOnlyFallback
            v-for="index in 4"
            :key="index"
            height="295px"
            width="100%"
          />
        </div>
      </div>
    </template>
  </div>
</template>
