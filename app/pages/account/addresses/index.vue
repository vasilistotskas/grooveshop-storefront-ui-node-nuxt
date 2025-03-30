<script lang="ts" setup>
const { t } = useI18n({ useScope: 'local' })
const route = useRoute()
const { user } = useUserSession()
const { $i18n } = useNuxtApp()

const pageSize = ref(8)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-isMain')

const entityOrdering = ref<EntityOrdering<UserAddressOrderingField>>([
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

const { data: addresses, status, error } = await useFetch<Pagination<UserAddress>>(
  `/api/user/account/${user.value?.id}/addresses`,
  {
    key: `userAddresses${user.value?.id}`,
    method: 'GET',
    headers: useRequestHeaders(),
    query: {
      page: page,
      ordering: ordering,
      pageSize: pageSize,
    },
  },
)

const refreshAddresses = async () => {
  status.value = 'pending'
  const addresses = await $fetch<Pagination<UserAddress>>(
    `/api/user/account/${user.value?.id}/addresses`,
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
  return addresses
}

const onAddressDelete = async () => {
  addresses.value = await refreshAddresses()
}

const pagination = computed(() => {
  if (!addresses.value?.count) return
  return usePagination(addresses.value)
})

const orderingOptions = computed(() => {
  return useOrdering<UserAddressOrderingField>(entityOrdering.value)
})

watch(
  () => route.query,
  async () => {
    addresses.value = await refreshAddresses()
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
    <LazyAddressList
      v-if="status !== 'pending' && addresses?.count"
      :addresses="addresses?.results"
      :addresses-count="addresses?.count"
      @address-delete="onAddressDelete"
    />
    <div v-else-if="status === 'pending'" class="grid w-full items-start gap-4">
      <ClientOnlyFallback
        class="flex w-full items-center justify-center"
        height="20px"
        width="100%"
      />
      <ClientOnlyFallback
        class="
            grid grid-cols-2 gap-4

            lg:grid-cols-3

            xl:grid-cols-4
          "
        :count="addresses?.results?.length || 4"
        height="360px"
        width="100%"
      />
    </div>
    <Error v-else-if="error" :error="error" />
    <AddressAddNew v-else-if="!addresses?.count" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Διευθύνσεις
</i18n>
