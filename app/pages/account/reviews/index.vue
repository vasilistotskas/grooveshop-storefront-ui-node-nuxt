<script lang="ts" setup>
const route = useRoute()
const { t } = useI18n({ useScope: 'local' })
const { user } = useUserSession()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

const pageSize = ref(8)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<ProductReviewOrderingField>>([
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

const { data: reviews, status, error } = useFetch<Pagination<ProductReview>>(
  `/api/user/account/${user.value?.id}/product-reviews`,
  {
    key: `userProductReviews${user.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      ordering: ordering,
      pageSize: pageSize,
    },
  },
)

const refreshReviews = async () => {
  status.value = 'pending'
  const reviews = await $fetch<Pagination<ProductReview>>(
    `/api/user/account/${user.value?.id}/product-reviews`,
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
  return reviews
}

const pagination = computed(() => {
  if (!reviews.value?.count) return
  return usePagination<ProductReview>(reviews.value)
})

const orderingOptions = computed(() => {
  return useOrdering<ProductReviewOrderingField>(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    reviews.value = await refreshReviews()
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
    <LazyProductReviewsList
      v-if="status !== 'pending' && reviews?.count"
      :reviews="reviews?.results"
      :reviews-count="reviews?.count"
      display-image-of="product"
    />
    <div v-else-if="status === 'pending'" class="grid gap-4">
      <USkeleton
        class="flex h-5 w-full items-center justify-center"
      />
      <div class="grid gap-4">
        <USkeleton
          v-for="i in (reviews?.count || 4)"
          :key="i"
          class="h-[126px] w-full"
        />
      </div>
    </div>
    <Error v-else-if="error" :error="error" />
    <LazyEmptyState
      v-else-if="!reviews?.count"
      class="w-full"
      :title="$i18n.t('empty.title')"
    >
      <template
        #icon
      >
        <UIcon
          name="i-mdi-star-outline"
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
  title: Κριτικές
</i18n>
