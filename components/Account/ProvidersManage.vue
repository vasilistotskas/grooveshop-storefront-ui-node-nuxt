<script lang="ts" setup>
import { type ProvidersDeleteBody } from '~/types/all-auth'
import type { DropdownItem } from '#ui/types'

const emit = defineEmits(['disconnectThirdPartyProviderAccount'])

const {
  connectedThirdPartyProviderAccounts,
  disconnectThirdPartyProviderAccount,
} = useAllAuthAccount()
const toast = useToast()
const { t } = useI18n()

const loading = ref(false)

const { data: providerAccounts, refresh: refreshProviderAccounts } = await connectedThirdPartyProviderAccounts()

async function disconnect(values: ProvidersDeleteBody) {
  console.log('=== disconnect ===', values)
  try {
    loading.value = true
    await disconnectThirdPartyProviderAccount(values)
    await refreshProviderAccounts()
    toast.add({
      title: t('common.success.title'),
      color: 'green',
    })
    emit('disconnectThirdPartyProviderAccount')
  }
  catch (error) {
    toast.add({
      title: t('common.error.default'),
      color: 'red',
    })
  }
}

const columns = [{
  key: 'uid',
  label: t('common.uid'),
}, {
  key: 'display',
  label: t('common.display'),
}, {
  key: 'name',
  label: t('common.name'),
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
    label: t('common.disconnect'),
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
</script>

<template>
  <div
    class="
      grid gap-4

      md:gap-12
    "
  >
    <UTable :columns="columns" :rows="rows">
      <template #actions-data="{ row }">
        <UDropdown v-if="actionItems(row).length > 0" :items="actionItems(row)">
          <UButton color="gray" icon="i-heroicons-ellipsis-horizontal-20-solid" variant="ghost" />
        </UDropdown>
      </template>
    </UTable>
  </div>
</template>
