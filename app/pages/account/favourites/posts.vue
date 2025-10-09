<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()
const { user } = useUserSession()
const { enabled } = useAuthPreviewMode()
const { $i18n } = useNuxtApp()

const pageSize = ref(4)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<any>>([
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

const { data: favourites, status } = useFetch(
  `/api/user/account/${user.value?.id}/liked-blog-posts`,
  {
    key: `likedBlogPosts${user.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      ordering: ordering,
      pageSize: pageSize,
    },
  },
)

const refreshFavourites = async () => {
  status.value = 'pending'
  const favourites = await $fetch(
    `/api/user/account/${user.value?.id}/liked-blog-posts`,
    {
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        page: page.value,
        ordering: ordering.value,
        pageSize: pageSize.value,
      },
    },
  )
  status.value = 'success'
  return favourites
}

const pagination = computed(() => {
  if (!favourites.value?.count) return
  return usePagination<BlogPost>(favourites.value)
})

const orderingOptions = computed(() => {
  return useOrdering<any>(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    favourites.value = await refreshFavourites()
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
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />
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
    <LazyBlogPostFavouritesList
      v-if="status !== 'pending' && favourites?.count"
      :favourites="favourites?.results"
      :favourites-count="favourites?.count"
    />
    <div
      v-if="status === 'pending'"
      class="grid w-full items-start gap-4"
    >
      <USkeleton
        class="flex h-4 w-full items-center justify-center"
      />
      <div
        class="
          grid grid-cols-2 gap-4
          lg:grid-cols-3
          xl:grid-cols-4
        "
      >
        <USkeleton
          v-for="i in (favourites?.count || 4)"
          :key="i"
          class="h-72 w-full"
        />
      </div>
    </div>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Αγαπημένες Δημοσιεύσεις
</i18n>
