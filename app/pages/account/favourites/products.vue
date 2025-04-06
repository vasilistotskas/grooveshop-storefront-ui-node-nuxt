<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const { enabled } = useAuthPreviewMode()
const route = useRoute()
const { user } = useUserSession()
const { $i18n } = useNuxtApp()
const userStore = useUserStore()
const { updateFavouriteProducts } = userStore
const localePath = useLocalePath()

const pageSize = ref(8)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<ProductFavouriteOrderingField>>([
  {
    value: 'createdAt',
    label: $i18n.t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'updatedAt',
    label: $i18n.t('ordering.updated_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: favourites, refresh: refreshFavourites, status, error } = await useFetch<Pagination<ProductFavourite>>(
  `/api/user/account/${user.value?.id}/favourite-products`,
  {
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      ordering: ordering,
      pageSize: pageSize,
      expand: 'true',
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
    getEntityId(favourite.product) as number,
  )
})

const { refresh: refreshFavouriteProducts } = await useFetch<ProductFavourite[]>('/api/products/favourites/favourites-by-products', {
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
    updateFavouriteProducts(favourites)
  },
})

const pagination = computed(() => {
  if (!favourites.value?.count) return
  return usePagination<ProductFavourite>(favourites.value)
})

const orderingOptions = computed(() => {
  return useOrdering<ProductFavouriteOrderingField>(entityOrdering.value)
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

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4

      md:gap-8
    "
  >
    <PageTitle :text="t('title')" />

    <LazyUserAccountFavouritesNavbar v-if="enabled" />
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
    <LazyProductFavouritesList
      v-if="status !== 'pending' && favourites?.count"
      :favourites="favourites?.results"
      :favourites-total="favourites?.count"
      @refresh-favourites="refreshFavourites"
    />
    <div v-else-if="status === 'pending'" class="grid w-full items-start gap-4">
      <USkeleton
        class="flex h-5 w-full items-center justify-center"
      />
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
        <USkeleton
          v-for="i in (favourites?.count || 4)"
          :key="i"
          class="h-[295px] w-full"
        />
      </div>
    </div>
    <Error v-else-if="error" :error="error" />
    <LazyEmptyState
      v-else-if="!favourites?.count"
      class="w-full"
      :title="$i18n.t('empty.title')"
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
          :label="$i18n.t('empty.description')"
          :to="localePath('index')"
          class="font-semibold"
          color="secondary"
          size="xl"
          type="button"
        />
      </template>
    </LazyEmptyState>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αγαπημένα Προϊόντα
</i18n>
