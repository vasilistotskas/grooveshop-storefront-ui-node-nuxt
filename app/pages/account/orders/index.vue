<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const route = useRoute()
const { user } = useUserSession()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

const pageSize = ref(8)
const pending = ref(true)
const page = computed(() => route.query.page || 1)
const ordering = computed(() => route.query.ordering || '-createdAt')

const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'status',
    label: t('ordering.status'),
    options: ['ascending', 'descending'],
  },
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

const { data: orders, status, error } = await useFetch<Pagination<Order>>(
  `/api/orders/my-orders`,
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
  status.value = 'pending'
  const orders = await $fetch<Pagination<Order>>(`/api/orders/my-orders`, {
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page.value,
      ordering: ordering.value,
      pageSize: pageSize.value,
    },
  })
  status.value = 'success'
  return orders
}

const pagination = computed(() => {
  if (!orders.value?.count) return
  return usePagination<Order>(orders.value)
})

const orderingOptions = computed(() => {
  return useOrdering<any>(entityOrdering.value)
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
      flex flex-col gap-4

      md:gap-8 md:!p-0 md:mt-1
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />

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
    <LazyOrderList
      v-if="status !== 'pending' && orders?.count"
      :orders="orders?.results"
      :orders-total="orders?.count"
    />
    <div
      v-else-if="status === 'pending'"
      class="grid gap-2 md:gap-4"
    >
      <USkeleton
        v-for="i in (orders?.count || 4)"
        :key="i"
        class="h-[202px] w-full"
      />
    </div>
    <Error
      v-else-if="error"
      :error="error"
    />
    <LazyEmptyState
      v-else-if="!orders?.count"
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
  title: Παραγγελίες
</i18n>
