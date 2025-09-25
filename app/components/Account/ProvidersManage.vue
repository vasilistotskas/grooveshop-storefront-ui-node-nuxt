<script lang="ts" setup>
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

const emit = defineEmits(['disconnectThirdPartyProviderAccount'])

const {
  connectedThirdPartyProviderAccounts,
  disconnectThirdPartyProviderAccount,
} = useAllAuthAccount()
const toast = useToast()
const { t } = useI18n()
const { $i18n } = useNuxtApp()

const loading = ref(false)

const { data: providerAccounts, refresh: refreshProviderAccounts } = await useAsyncData(
  'providerAccounts',
  () => connectedThirdPartyProviderAccounts(),
)

async function disconnect(values: ProvidersDeleteBody) {
  try {
    loading.value = true
    await disconnectThirdPartyProviderAccount(values)
    await refreshProviderAccounts()
    toast.add({
      title: $i18n.t('success.title'),
      color: 'success',
    })
    emit('disconnectThirdPartyProviderAccount')
  }
  catch (error) {
    handleAllAuthClientError(error)
  }
  finally {
    loading.value = false
  }
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'uid',
    header: t('uid'),
  },
  {
    accessorKey: 'display',
    header: t('display'),
  },
  {
    accessorKey: 'name',
    header: t('name'),
  },
  {
    id: 'actions',
    header: '',
  },
]

const data = computed(() => {
  return providerAccounts.value?.data.map((account) => {
    return {
      uid: account.uid,
      display: account.display,
      name: account.provider.name,
    }
  }) || []
})

const actionItems = (row: { uid: string, display: string, name: string }): DropdownMenuItem[][] => {
  const items: DropdownMenuItem[] = []
  items.push({
    label: t('disconnect'),
    icon: 'i-heroicons-trash-20-solid',
    onSelect: async () => {
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
      :data="data"
      :empty-state="{ icon: 'i-heroicons-ellipsis-horizontal-20-solid', label: $i18n.t('auth.providers.empty') }"
      :loading="loading"
    >
      <template #actions-cell="{ row }">
        <LazyUDropdownMenu
          v-if="actionItems(row.original).length > 0"
          :items="actionItems(row.original)"
        >
          <UButton
            color="neutral"
            icon="i-heroicons-ellipsis-horizontal-20-solid"
            variant="ghost"
          />
        </LazyUDropdownMenu>
      </template>
    </UTable>
  </div>
</template>
