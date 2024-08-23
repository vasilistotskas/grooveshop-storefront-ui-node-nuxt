<script lang="ts" setup>
import { AuthenticatorType } from '~/types/all-auth'
import type { DropdownItem } from '#ui/types'

const { getAuthenticators, deleteWebAuthnCredential, updateWebAuthnCredential } = useAllAuthAccount()
const { t } = useI18n()
const localePath = useLocalePath()
const toast = useToast()

const { data: authenticators } = await useAsyncData(
  'authenticators',
  () => getAuthenticators(),
)

const editId = ref<number | null>(null)
const loading = ref(false)
const keys = ref(authenticators.value?.data.filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN))

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
      title: ok ? t('common.success.title') : t('common.error.default'),
      color: ok ? 'green' : 'red',
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

const columns = [{
  key: 'id',
  label: t('common.id'),
}, {
  key: 'name',
  label: t('common.name'),
}, {
  key: 'type',
  label: t('common.type'),
}, {
  key: 'created_at',
  label: t('common.created_at'),
  sortable: true,
}, {
  key: 'last_used_at',
  label: t('common.last_used_at'),
}, {
  key: 'actions',
}]

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

const actionItems = (row: { name: string, type: string, created_at: string, last_used_at: string }) => {
  const items: DropdownItem[] = []

  items.push({
    label: t('common.delete.title'),
    icon: 'i-heroicons-trash-20-solid',
    click: () => deleteKey(keys.value?.find(key => key.name === row.name)),
  })

  items.push({
    label: t('common.edit.title'),
    icon: 'i-heroicons-pencil-20-solid',
    click: () => editId.value = keys.value?.find(key => key.name === row.name)?.id ?? null,
  })

  if (items.length === 0) {
    return []
  }
  return [items]
}

if (!keys.value?.length && !loading.value) {
  await navigateTo(localePath('/account/2fa'))
}

onReactivated(async () => {
  keys.value = (await getAuthenticators())?.data.filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN)
})
</script>

<template>
  <div class="container-md mx-auto grid gap-2 !p-0">
    <section
      class="
        mt-6 grid gap-4

        md:gap-8
      "
    >
      <UTable
        :columns="columns"
        :empty-state="{ icon: 'i-heroicons-ellipsis-horizontal-20-solid', label: $t('common.empty.title') }"
        :rows="rows"
      >
        <template #name-data="{ row }">
          <UInput
            v-model="row.name"
            :name="row.name"
            size="sm"
            color="white"
            variant="none"
            :placeholder="row.name"
            :disabled="editId !== row.id"
            :loading="loading"
            :ui="{
              base: '!p-0',
              icon: { trailing: { pointer: '' } },
            }"
          >
            <template #trailing>
              <UButton
                v-show="editId === row.id"
                color="gray"
                variant="link"
                icon="i-heroicons-check-20-solid"
                :padded="false"
                @click="onSave(row, row.name)"
              />
            </template>
          </UInput>
        </template>
        <template #type-data="{ row }">
          <span>
            {{ typeof row.is_passwordless === 'undefined' ? $t('common.type_unspecified') : (row.is_passwordless ? $t('common.passkey') : $t('common.security_key')) }}
          </span>
        </template>

        <template #created_at-data="{ row }">
          <span>{{ new Date(row.created_at * 1000).toLocaleString() }}</span>
        </template>

        <template #last_used_at-data="{ row }">
          <span>
            {{ row.last_used_at ? new Date(row.last_used_at * 1000).toLocaleString() : $t('common.unused') }}
          </span>
        </template>
        <template #actions-data="{ row }">
          <UDropdown
            v-if="actionItems(row).length > 0"
            :items="actionItems(row)"
          >
            <UButton color="gray" icon="i-heroicons-ellipsis-horizontal-20-solid" variant="ghost" />
          </UDropdown>
        </template>
      </UTable>
    </section>
    <div class="grid justify-end">
      <UButton
        :label="$t('common.add.title')"
        :to="localePath('/account/2fa/webauthn/add')"
        color="opposite"
        size="md"
        type="button"
        variant="link"
      />
    </div>
  </div>
</template>
