<script lang="ts" setup>
const { t } = useI18n()
const route = useRoute()
const { user } = useUserSession()
const { $i18n } = useNuxtApp()
const localePath = useLocalePath()

const pageSize = ref(8)
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

const { data: addresses, status, error } = await useFetch(
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
  const addresses = await $fetch(
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
  return useOrdering<any>(entityOrdering.value)
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
      md:mt-1 md:gap-8 md:!p-0
    "
  >
    <PageTitle
      :text="t('title')"
      class="md:mt-0"
    />

    <div class="flex flex-row items-center gap-2">
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
      <UButton
        class="w-auto"
        color="secondary"
        variant="outline"
        trailing-icon="i-heroicons-plus"
        :label="t('button')"
        :to="localePath('account-addresses-new')"
      />
    </div>
    <LazyAddressList
      v-if="status !== 'pending' && addresses?.count"
      :addresses="addresses?.results"
      :addresses-count="addresses?.count"
      @address-delete="onAddressDelete"
    />
    <div
      v-else-if="status === 'pending'"
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
          v-for="i in (addresses?.results?.length || 4)"
          :key="i"
          class="h-[360px] w-full"
        />
      </div>
    </div>
    <Error
      v-else-if="error"
      :error="error"
    />
    <AddressAddNew v-else-if="!addresses?.count" />
  </PageWrapper>
</template>

<i18n lang="yaml">
el:
  title: Διευθύνσεις
  button: Προσθήκη
</i18n>
