<script lang="ts" setup>
import type { Order, OrderOrderingField } from '~/types/order/order'
import type { EntityOrdering } from '~/types/ordering'

const { t } = useI18n()
const route = useRoute()
const { user } = useUserSession()

const pageSize = ref(8)
const pending = ref(true)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<OrderOrderingField>>([
  {
    value: 'status',
    label: t('pages.account.orders.ordering.status'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'createdAt',
    label: t('pages.account.orders.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'updatedAt',
    label: t('pages.account.orders.ordering.updated_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: orders } = await useFetch(
  `/api/user/account/${user.value?.id}/orders`,
  {
    method: 'GET',
    query: {
      page: page.value,
      ordering: ordering.value,
      pageSize: pageSize.value,
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
  const orders = await $fetch(`/api/user/account/${user.value?.id}/orders`, {
    method: 'GET',
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
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      orders.value = await refreshOrders()
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
      container flex flex-col gap-4 !p-0

      md:gap-8
    "
  >
    <PageTitle :text="$t('pages.account.orders.title')" />
    <PageBody>
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
      <OrderList
        v-if="!pending && orders?.results?.length"
        :orders="orders?.results"
        :orders-total="orders?.count"
      />
      <template v-if="pending">
        <div
          class="
            grid gap-2

            md:gap-4
          "
        >
          <ClientOnlyFallback
            v-for="index in 4"
            :key="index"
            height="202px"
            width="100%"
          />
        </div>
      </template>
    </PageBody>
  </PageWrapper>
</template>
