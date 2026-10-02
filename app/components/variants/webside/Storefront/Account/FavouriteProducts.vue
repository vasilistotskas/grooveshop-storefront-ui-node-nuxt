<script lang="ts" setup>
const { t, locale } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
const route = useRoute(`account-favourites-products___${locale.value}`)
const { user } = useUserSession()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore
const localePath = useLocalePath()

const pageSize = ref(8)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'createdAt',
    label: t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'updatedAt',
    label: t('ordering.updated_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: favourites, refresh: refreshFavourites, status, error } = await useApi(
  `/api/user/account/${user.value?.id}/favourite-products`,
  {
    key: `favouriteProducts${user.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      ordering: ordering,
      pageSize: pageSize,
    },
    onResponse({ response }) {
      if (!response.ok) {
        return
      }
    },
  },
)

const productIds = computed(() => {
  if (!favourites.value) return []
  return favourites.value.results?.map(favourite =>
    favourite.product.id,
  )
})

const { refresh: refreshFavouriteProducts } = await useApi('/api/products/favourites/favourites-by-products', {
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

const pagination = computed(() => {
  if (!favourites.value?.count) return
  return usePagination<ProductFavourite>(favourites.value)
})

const orderingOptions = computed(() => {
  return useOrdering<any>(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    await refreshFavourites()
    if (productIds.value && productIds.value.length > 0) {
      await refreshFavouriteProducts()
    }
  },
)
</script>

<template>
  <WebsideAccountAreaPageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <WebsidePageTitle
      :text="t('title')"
      class="md:mt-0"
    />

    <LazyWebsideUserAccountFavouritesNavbar />
    <div class="flex flex-row flex-wrap items-center gap-2">
      <WebsideAccountAreaPaginationPageNumber
        v-if="pagination"
        :count="pagination.count"
        :page="pagination.page"
        :page-size="pagination.pageSize"
      />
      <WebsideOrdering
        :ordering="String(ordering)"
        :ordering-options="orderingOptions.orderingOptionsArray.value"
      />
    </div>
    <LazyWebsideProductFavouritesList
      v-if="status === 'success' && favourites?.count"
      :favourites="favourites?.results"
      :favourites-total="favourites?.count"
      @refresh-favourites="refreshFavourites"
    />
    <div
      v-else-if="status === 'pending' || !favourites"
      class="grid w-full items-start gap-4"
    >
      <USkeleton
        class="flex h-5 w-full items-center justify-center"
      />
      <div
        class="
          grid grid-cols-2 gap-4
          lg:grid-cols-3
          xl:grid-cols-4
        "
      >
        <USkeleton
          v-for="i in 4"
          :key="i"
          class="h-72 w-full"
        />
      </div>
    </div>
    <WebsideError
      v-else-if="error"
      :error="error"
    />
    <LazyWebsideEmptyState
      v-else-if="status === 'success' && !favourites?.count"
      class="w-full"
      :title="t('empty.title')"
    >
      <template
        #icon
      >
        <UIcon
          name="i-mdi-package-variant-closed"
          size="xl"
        />
      </template>
      <template
        #actions
      >
        <UButton
          :label="t('empty.description')"
          :to="localePath('index')"
          class="font-semibold"
          color="secondary"
          size="xl"
          type="button"
        />
      </template>
    </LazyWebsideEmptyState>
  </WebsideAccountAreaPageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αγαπημένα Προϊόντα
en:
  title: Favourite Products
</i18n>
