<script lang="ts" setup>
const route = useRoute()
const { t } = useI18n({ useScope: 'local' })
const { user } = useUserSession()

const pageSize = ref(8)
const pending = ref(true)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<ProductReviewOrderingField>>([
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

const { data: reviews } = await useFetch<Pagination<ProductReview>>(
  `/api/user/account/${user.value?.id}/product-reviews`,
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
      pending.value = false
    },
  },
)

const refreshReviews = async () => {
  pending.value = true
  const reviews = await $fetch<Pagination<ProductReview>>(
    `/api/user/account/${user.value?.id}/product-reviews`,
    {
      method: 'GET',
      headers: useRequestHeaders(),
      query: {
        page: page.value,
        ordering: ordering.value,
        pageSize: pageSize.value,
        expand: 'true',
      },
    },
  )
  pending.value = false
  return reviews
}

const pagination = computed(() => {
  if (!reviews.value) return
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
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="t('title')" />
    <PageBody>
      <div class="flex flex-row flex-wrap items-center gap-2">
        <LazyPaginationPageNumber
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
      <ProductReviewsList
        v-if="!pending && reviews?.results?.length"
        :reviews="reviews?.results"
        :reviews-count="reviews?.count"
        display-image-of="product"
      />
      <template v-if="pending">
        <div class="grid gap-4">
          <ClientOnlyFallback
            class="flex items-center justify-center"
            height="20px"
            width="100%"
          />
          <ClientOnlyFallback
            class="grid gap-4"
            :count="reviews?.results?.length || 4"
            height="126px"
            width="100%"
          />
        </div>
      </template>
    </PageBody>
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Κριτικές
</i18n>
