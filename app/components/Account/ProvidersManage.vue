<script lang="ts" setup>
import type { ProvidersDeleteBody, ProvidersGetResponse } from '~/types/all-auth'
import type { DropdownItem } from '#ui/types'

const emit = defineEmits(['disconnectThirdPartyProviderAccount'])

const {
  connectedThirdPartyProviderAccounts,
  disconnectThirdPartyProviderAccount,
} = useAllAuthAccount()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

const { data: providerAccounts, refresh: refreshProviderAccounts } = await useAsyncData<ProvidersGetResponse>(
  'providerAccounts',
  () => connectedThirdPartyProviderAccounts(),
)

async function disconnect(values: ProvidersDeleteBody) {
  try {
    loading.value = true
    await disconnectThirdPartyProviderAccount(values)
    await refreshProviderAccounts()
    toast.add({
      title: t('success.title'),
      color: 'green',
    })
    emit('disconnectThirdPartyProviderAccount')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
}

const columns = [{
  key: 'uid',
  label: t('uid'),
}, {
  key: 'display',
  label: t('display'),
}, {
  key: 'name',
  label: t('name'),
}, {
  key: 'actions',
}]

const rows = computed(() => {
  return providerAccounts.value?.data.map((account) => {
    return {
      uid: account.uid,
      display: account.display,
      name: account.provider.name,
    }
  })
})

const actionItems = (row: { uid: string, display: string, name: string }) => {
  const items: DropdownItem[] = []
  items.push({
    label: t('disconnect'),
    icon: 'i-heroicons-trash-20-solid',
    click: async () => {
      const account = providerAccounts.value?.data.find(item => item.uid === row.uid)
      if (!account) return
      return await disconnect({
        provider: account.provider.id,
        account: account.uid,
      })
    },
  })
  return [items]
}

onReactivated(async () => {
  await refreshProviderAccounts()
})
</script>

<template>
  <div
    class="
      grid gap-4

      lg:flex
    "
  >
    <slot />
    <UTable
      class="w-full"
      :columns="columns"
      :empty-state="{ icon: 'i-heroicons-ellipsis-horizontal-20-solid', label: $t('auth.providers.empty') }"
      :rows="rows"
    >
      <template #actions-data="{ row }">
        <LazyUDropdown
          v-if="actionItems(row).length > 0"
          :items="actionItems(row)"
        >
          <UButton color="gray" icon="i-heroicons-ellipsis-horizontal-20-solid" variant="ghost" />
        </LazyUDropdown>
      </template>
    </UTable>
  </div>
</template>
