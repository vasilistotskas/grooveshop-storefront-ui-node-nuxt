<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'
import type { EntityOrdering } from '~/types/ordering'
import type {
  ProductFavourite,
  ProductFavouriteOrderingField,
} from '~/types/product/favourite'
import { getEntityId } from '~/utils/entity'

const { t } = useI18n()
const route = useRoute('account-favourites-products___en')
const { user } = useUserSession()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore

const pageSize = ref(8)
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

const { data: favourites, pending } = await useLazyFetch(
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
  if (!favourites.value) return
  return favourites.value.results?.map(favourite =>
    getEntityId(favourite.product),
  )
})

await useFetch('/api/products/favourites/favourites-by-products', {
  method: 'POST',
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
  if (!favourites.value) return
  return usePagination<ProductFavourite>(favourites.value)
})

const orderingOptions = computed(() => {
  return useOrdering<ProductFavouriteOrderingField>(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    favourites.value = await refreshFavourites()
    if (productIds.value && productIds.value.length > 0) {
      await refreshFavouriteProducts(productIds.value)
    }
  },
  { deep: true },
)

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="$t('pages.account.favourites.products.title')" />
    <UserAccountFavouritesNavbar />
    <PageBody>
      <div class="flex flex-row flex-wrap items-center gap-2">
        <PaginationPageNumber
          v-if="pagination"
          :count="pagination.count"
          :page-size="pagination.pageSize"
          :page="pagination.page"
        />
        <Ordering
          :ordering="String(ordering)"
          :ordering-options="orderingOptions.orderingOptionsArray.value"
        />
      </div>
      <ProductFavouritesList
        v-if="!pending && favourites?.results?.length"
        :favourites="favourites?.results"
        :favourites-count="favourites?.count"
      />
      <template v-if="pending">
        <div class="grid w-full items-start gap-4">
          <div class="flex w-full items-center justify-center">
            <ClientOnlyFallback class="w-full" height="20px" width="100%" />
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
      <EmptyState
        v-if="!pending && !favourites?.results?.length"
        :icon="emptyIcon"
      >
        <template #actions>
          <UButton
            :label="$t('common.empty.button')"
            :to="'index'"
            color="primary"
          />
        </template>
      </EmptyState>
    </PageBody>
  </PageWrapper>
</template>
