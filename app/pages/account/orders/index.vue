<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const route = useRoute()
const { user } = useUserSession()

const pageSize = ref(8)
const pending = ref(true)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<OrderOrderingField>>([
  {
    value: 'status',
    label: t('ordering.status'),
    options: ['ascending', 'descending'],
  },
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

const { data: orders } = await useFetch<Pagination<Order>>(
  `/api/user/account/${user.value?.id}/orders`,
  {
    key: `userOrders${user.value?.id}`,
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
      pending.value = false
    },
  },
)

const refreshOrders = async () => {
  pending.value = true
  const orders = await $fetch<Pagination<Order>>(`/api/user/account/${user.value?.id}/orders`, {
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page.value,
      ordering: ordering.value,
      pageSize: pageSize.value,
    },
  })
  pending.value = false
  return orders
}

const pagination = computed(() => {
  if (!orders.value) return
  return usePagination<Order>(orders.value)
})

const orderingOptions = computed(() => {
  return useOrdering<OrderOrderingField>(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    orders.value = await refreshOrders()
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
    <LazyOrderList
      v-if="!pending && orders?.results?.length"
      :orders="orders?.results"
      :orders-total="orders?.count"
    />
    <ClientOnlyFallback
      v-if="pending"
      class="
          grid gap-2

          md:gap-4
        "
      :count="orders?.results?.length || 4"
      height="202px"
      width="100%"
    />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Παραγγελίες
</i18n>
