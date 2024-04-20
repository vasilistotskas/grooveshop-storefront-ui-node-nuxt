<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'
import type { EntityOrdering } from '~/types/ordering'
import type {
  ProductReview,
  ProductReviewOrderingField,
} from '~/types/product/review'

const { t } = useI18n()
const route = useRoute('account-reviews___en')
const { user } = useUserSession()

const pageSize = ref(8)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<ProductReviewOrderingField>>([
  {
    value: 'createdAt',
    label: t('pages.account.reviews.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'updatedAt',
    label: t('pages.account.reviews.ordering.updated_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: reviews, pending } = await useFetch(
  `/api/user/account/${user.value?.id}/product-reviews`,
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

const refreshReviews = async () => {
  pending.value = true
  const reviews = await $fetch(
    `/api/user/account/${user.value?.id}/product-reviews`,
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
    <PageTitle :text="$t('pages.account.reviews.title')" />
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
      <ProductReviewsList
        v-if="!pending && reviews?.results?.length"
        :reviews="reviews?.results"
        :reviews-count="reviews?.count"
        display-image-of="product"
      />
      <template v-if="pending">
        <div class="grid gap-4">
          <div class="flex items-center justify-center">
            <ClientOnlyFallback class="w-full" height="20px" width="100%" />
          </div>
          <div class="grid gap-4">
            <ClientOnlyFallback
              v-for="index in 4"
              :key="index"
              height="126px"
              width="100%"
            />
          </div>
        </div>
      </template>
      <EmptyState
        v-if="!pending && !reviews?.results?.length"
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
