<script lang="ts" setup>
import emptyIcon from '~icons/mdi/package-variant-remove'
import type { EntityOrdering } from '~/types/ordering'
import type { UserAddressOrderingField } from '~/types/user/address'

const { t } = useI18n()
const route = useRoute('account-addresses___en')
const { user } = useUserSession()

const pageSize = ref(4)
const page = computed(() => route.query.page)
const ordering = computed(() => route.query.ordering || '-isMain')

const entityOrdering = ref<EntityOrdering<UserAddressOrderingField>>([
  {
    value: 'createdAt',
    label: t('pages.account.addresses.ordering.created_at'),
    options: ['ascending', 'descending'],
  },
  {
    value: 'updatedAt',
    label: t('pages.account.addresses.ordering.updated_at'),
    options: ['ascending', 'descending'],
  },
])

const { data: addresses, pending } = await useLazyFetch(
  `/api/user/account/${user.value?.id}/addresses`,
  {
    method: 'GET',
    query: {
      page: page.value,
      ordering: ordering.value,
      pageSize: pageSize.value,
    },
  },
)

const refreshAddresses = async () => {
  pending.value = true
  const addresses = await $fetch(
    `/api/user/account/${user.value?.id}/addresses`,
    {
      method: 'GET',
      query: {
        page: page.value,
        ordering: ordering.value,
        pageSize: pageSize.value,
      },
    },
  )
  pending.value = false
  return addresses
}

const pagination = computed(() => {
  if (!addresses.value) return
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
  { deep: true },
)

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper class="container flex flex-col gap-4 !p-0 md:gap-8">
    <PageHeader>
      <PageTitle :text="$t('pages.account.addresses.title')" />
    </PageHeader>
    <PageBody>
      <div class="flex flex-row flex-wrap items-center gap-2">
        <PaginationPageNumber
          v-if="pagination"
          :count="pagination.count"
          :total-pages="pagination.totalPages"
          :page-total-results="pagination.pageTotalResults"
          :page-size="pagination.pageSize"
          :page="pagination.page"
          :links="pagination.links"
        />
        <Ordering
          :ordering="String(ordering)"
          :ordering-options="orderingOptions.orderingOptionsArray.value"
        />
      </div>
      <AddressList
        v-if="!pending && addresses?.results?.length"
        :addresses="addresses?.results"
        :addresses-total="addresses?.count"
      />
      <template v-if="pending">
        <div class="grid w-full items-start gap-4">
          <div class="flex w-full items-center justify-center">
            <ClientOnlyFallback class="w-full" height="20px" width="100%" />
          </div>
          <div class="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
            <ClientOnlyFallback
              v-for="index in 4"
              :key="index"
              height="360px"
              width="100%"
            />
          </div>
        </div>
      </template>
      <EmptyState
        v-if="!pending && !addresses?.results?.length"
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
