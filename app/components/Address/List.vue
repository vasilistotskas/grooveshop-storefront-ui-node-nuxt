<script lang="ts" setup>
import type { UserAddressOrderingField } from '~/types/user/address'
import type { EntityOrdering } from '~/types/ordering'

defineProps({
  displayTotal: {
    type: Boolean,
    required: false,
    default: true,
  },
})

const { t } = useI18n()
const route = useRoute()
const { user } = useUserSession()

const pending = ref(true)
const pageSize = ref(8)
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

const { data: addresses } = await useFetch(
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

const onAddressDelete = async () => {
  addresses.value = await refreshAddresses()
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
  async (newVal, oldVal) => {
    if (!deepEqual(newVal, oldVal)) {
      addresses.value = await refreshAddresses()
    }
  },
)
</script>

<template>
  <div class="address-list grid gap-4">
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
    <div class="grid w-full items-start gap-4">
      <div
        v-if="displayTotal && addresses?.count"
        class="flex items-center justify-center gap-1"
      >
        <span
          class="
            text-sm font-semibold text-secondary

            dark:text-secondary-dark
          "
        >
          {{ $t('pages.account.addresses.total', addresses?.count) }}
        </span>
      </div>
      <ul
        class="
          grid grid-cols-1 gap-4

          lg:grid-cols-3

          md:grid-cols-2

          xl:grid-cols-4
        "
      >
        <AddressAddNew />
        <AddressCard
          v-for="address in addresses?.results"
          :key="address.id"
          :address="address"
          @address-delete="onAddressDelete"
        />
      </ul>
    </div>
    <template v-if="pending">
      <div class="grid w-full items-start gap-4">
        <div class="flex w-full items-center justify-center">
          <ClientOnlyFallback
            class="w-full"
            height="20px"
            width="100%"
          />
        </div>
        <div
          class="
            grid grid-cols-2 gap-4

            lg:grid-cols-3

            xl:grid-cols-4
          "
        >
          <ClientOnlyFallback
            v-for="index in 4"
            :key="index"
            height="360px"
            width="100%"
          />
        </div>
      </div>
    </template>
  </div>
</template>
