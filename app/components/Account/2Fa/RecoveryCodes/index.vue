<script lang="ts" setup>
import type { TableColumn } from '@nuxt/ui'

const { getRecoveryCodes } = useAllAuthAccount()
const toast = useToast()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const { data, refresh, error } = await useAsyncData<RecoveryCodesGetResponse>(
  'recoveryCodes',
  () => getRecoveryCodes(),
)

if (error.value) {
  toast.add({
    title: $i18n.t('auth.mfa.required'),
    color: 'error',
  })
  navigateTo(localePath('account-settings'))
}

const unused_codes = computed(() => data.value?.data.unused_codes ?? [])
const created_at = computed(() => data.value?.data.created_at ?? null)
const last_used_at = computed(() => data.value?.data.last_used_at ?? null)
const total_code_count = computed(() => data.value?.data.total_code_count ?? 0)
const unused_code_count = computed(() => data.value?.data.unused_code_count ?? 0)

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'code',
    header: $i18n.t('code'),
  },
  {
    accessorKey: 'used',
    header: $i18n.t('used'),
  },
  {
    id: 'actions',
    header: '',
  },
]

const rows = computed(() => {
  return unused_codes.value?.map(code => ({
    code,
    // For the purpose of this example, we assume these are unused codes,
    // so the `used` property is set to false.
    used: false,
  })) ?? []
})

const downloadCodes = () => {
  if (!unused_codes.value) return
  const blob = new Blob([unused_codes.value.join('\n')], { type: 'text/plain' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.download = 'recovery-codes.txt'
  link.href = url
  link.click()
}

onReactivated(async () => {
  await refresh()
})
</script>

<template>
  <div class="grid gap-4 lg:flex">
    <slot />
    <section class="grid w-full gap-4 md:gap-8">
      <div class="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <p class="text-primary-950 dark:text-primary-50">
            <strong>{{ $i18n.t('total_code_count') }}:</strong> {{ total_code_count }}
          </p>
          <p class="text-primary-950 dark:text-primary-50">
            <strong>{{ $i18n.t('unused_code_count') }}:</strong> {{ unused_code_count }}
          </p>
          <p class="text-primary-950 dark:text-primary-50">
            <strong>{{ $i18n.t('ordering.created_at') }}:</strong>
            {{ created_at ? new Date(created_at * 1000).toLocaleString() : $i18n.t('unused') }}
          </p>
          <p class="text-primary-950 flex gap-1 dark:text-primary-50">
            <strong>{{ $i18n.t('last_used_at') }}:</strong>
            <span :class="last_used_at ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'">
              {{ last_used_at ? new Date(last_used_at * 1000).toLocaleString() : $i18n.t('unused') }}
            </span>
          </p>
        </div>
        <div class="grid items-center justify-center justify-items-center">
          <UButton class="w-full" icon="i-heroicons-arrow-down-on-square" @click="downloadCodes">
            {{ $i18n.t('download_codes') }}
          </UButton>
        </div>
      </div>

      <UTable :columns="columns" :data="rows">
        <template #actions-cell="{ row }">
          <UIcon
            :class="row.original.used ? 'text-green-500 dark:text-green-400' : 'text-red-500 dark:text-red-400'"
            :name="row.original.used ? 'i-heroicons-check-20-solid' : 'i-heroicons-x-mark'"
            class="size-6"
          />
        </template>
      </UTable>
    </section>
  </div>
</template>
