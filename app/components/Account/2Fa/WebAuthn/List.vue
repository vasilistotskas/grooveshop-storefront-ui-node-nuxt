<script lang="ts" setup>
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'

const { getAuthenticators, deleteWebAuthnCredential, updateWebAuthnCredential } = useAllAuthAccount()
const localePath = useLocalePath()
const toast = useToast()
const { $i18n } = useNuxtApp()

const authStore = useAuthStore()
const { authenticators } = storeToRefs(authStore)

const editId = ref<number | null>(null)
const loading = ref(false)
const keys = ref(authenticators.value?.filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN))

async function optimisticSetKeys(newKeys: any[], op: () => Promise<boolean>) {
  loading.value = true
  const oldKeys = keys.value
  editId.value = null
  keys.value = newKeys
  try {
    const ok = await op()
    if (!ok) {
      keys.value = oldKeys
    }
    toast.add({
      title: ok ? $i18n.t('success.title') : $i18n.t('error.default'),
      color: ok ? 'success' : 'error',
    })
  }
  catch {
    keys.value = oldKeys
  }
  finally {
    loading.value = false
  }
}

async function deleteKey(key: any) {
  const newKeys = keys.value?.filter(k => k.id !== key.id)
  if (!newKeys) {
    return
  }
  await optimisticSetKeys(newKeys, async () => {
    const resp = await deleteWebAuthnCredential({
      authenticators: [key.id],
    })
    return (resp?.status === 200)
  })
}

async function onSave(key: any, name: string) {
  const newKeys = keys.value?.filter(k => k.id !== key.id)
  newKeys?.push({ ...key, name })
  if (!newKeys) {
    return
  }
  await optimisticSetKeys(newKeys, async () => {
    const resp = await updateWebAuthnCredential({
      id: key.id,
      name,
    })
    return (resp?.status === 200)
  })
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'id',
    header: $i18n.t('id'),
  },
  {
    accessorKey: 'name',
    header: $i18n.t('name'),
  },
  {
    accessorKey: 'type',
    header: $i18n.t('type'),
  },
  {
    accessorKey: 'created_at',
    header: $i18n.t('ordering.created_at'),
  },
  {
    accessorKey: 'last_used_at',
    header: $i18n.t('last_used_at'),
  },
  {
    id: 'actions',
    header: '',
  },
]

const rows = computed(() => {
  return keys.value?.map((key) => {
    return {
      id: key.id,
      name: key.name,
      type: key.type,
      created_at: key.created_at,
      last_used_at: key.last_used_at,
      is_passwordless: key.is_passwordless ?? undefined,
    }
  }) ?? []
})

const actionItems = (row: { name: string, type: string, created_at: number, last_used_at?: number }) => {
  const items: DropdownMenuItem[] = []

  items.push({
    label: $i18n.t('edit.title'),
    icon: 'i-heroicons-pencil-20-solid',
    class: 'cursor-pointer',
    onSelect: () => (editId.value = keys.value?.find(key => key.name === row.name)?.id ?? null),
  })

  items.push({
    label: $i18n.t('delete.title'),
    icon: 'i-heroicons-trash-20-solid',
    class: 'cursor-pointer text-white bg-red-500 dark:bg-red-500 hover:dark:bg-red-600',
    onSelect: async () => await deleteKey(keys.value?.find(key => key.name === row.name)),
  })

  return items.length ? [items] : []
}

watchEffect(async () => {
  if (!keys.value?.length && !loading.value) {
    await navigateTo(localePath('account-2fa'))
  }
})

onReactivated(async () => {
  keys.value = (await getAuthenticators())?.data.filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN)
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
    <div class="flex w-full flex-col gap-2">
      <section
        class="
          grid gap-4
          md:gap-8
        "
      >
        <UTable
          :columns="columns"
          :empty-state="{ icon: 'i-heroicons-ellipsis-horizontal-20-solid', label: $i18n.t('empty.title') }"
          :data="rows"
          :loading="loading"
        >
          <template #name-cell="{ row }">
            <UInput
              v-model="row.original.name"
              :name="row.original.name"
              size="sm"
              color="neutral"
              variant="none"
              :placeholder="row.original.name"
              :disabled="editId !== row.original.id"
              :loading="loading"
              :ui="{
                base: '!p-0',
              }"
            >
              <template #trailing>
                <UButton
                  v-if="row.original.name && editId === row.original.id"
                  color="neutral"
                  variant="link"
                  icon="i-heroicons-check-20-solid"
                  :padded="false"
                  @click="onSave(row.original, row.original.name)"
                />
              </template>
            </UInput>
          </template>
          <template #type-cell="{ row }">
            <span>
              {{ row.original.type }}
            </span>
          </template>
          <template #created_at-cell="{ row }">
            <span>{{ new Date(row.original.created_at * 1000).toLocaleString() }}</span>
          </template>
          <template #last_used_at-cell="{ row }">
            <span>
              {{ row.original.last_used_at ? new Date(row.original.last_used_at * 1000).toLocaleString() : $i18n.t('unused') }}
            </span>
          </template>
          <template #actions-cell="{ row }">
            <LazyUDropdownMenu
              v-if="actionItems({
                name: row.original.name ?? '',
                type: row.original.type,
                created_at: row.original.created_at,
                last_used_at: row.original.last_used_at ?? null,
              }).length > 0"
              :items="actionItems({
                name: row.original.name ?? '',
                type: row.original.type,
                created_at: row.original.created_at,
                last_used_at: row.original.last_used_at ?? null,
              })"
            >
              <UButton
                color="neutral"
                icon="i-heroicons-ellipsis-horizontal-20-solid"
                variant="ghost"
              />
            </LazyUDropdownMenu>
          </template>
        </UTable>
      </section>
      <div class="grid justify-end">
        <UButton
          :label="$i18n.t('add.title')"
          :to="localePath('account-2fa-webauthn-add')"
          color="secondary"
          size="md"
          type="button"
          variant="link"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  type_unspecified: Μη καθορισμένος τύπος
</i18n>
