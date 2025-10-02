<script lang="ts" setup>
import type { BadgeProps, TableColumn, DropdownMenuItem } from '@nuxt/ui'

const { getAuthenticators, deleteWebAuthnCredential, updateWebAuthnCredential } = useAllAuthAccount()
const localePath = useLocalePath()
const toast = useToast()
const { t } = useI18n()
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

function getTypeColor(type: string) {
  const colors: Record<string, Partial<BadgeProps['color']>> = {
    webauthn: 'primary',
    totp: 'secondary',
    recovery_codes: 'neutral',
  }
  return colors[type] || 'neutral'
}

function getTypeLabel(type: string) {
  const labels: Record<string, string> = {
    webauthn: 'WebAuthn',
    totp: 'TOTP',
    recovery_codes: $i18n.t('recovery_codes'),
  }
  return labels[type] || type
}

const columns: TableColumn<any>[] = [
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
      is_passwordless: key.is_passwordless ?? false,
    }
  }) ?? []
})

const actionItems = (row: { id: number, name: string, type: string, created_at: number, last_used_at?: number }) => {
  const items: DropdownMenuItem[] = []
  const key = keys.value?.find(k => k.id === row.id)

  items.push({
    label: $i18n.t('edit.title'),
    icon: 'i-heroicons-pencil-20-solid',
    class: 'cursor-pointer',
    onSelect: () => (editId.value = row.id),
  })

  items.push({
    label: $i18n.t('delete.title'),
    icon: 'i-heroicons-trash-20-solid',
    class: 'cursor-pointer text-white bg-red-500 dark:bg-red-500 hover:dark:bg-red-600',
    onSelect: async () => await deleteKey(key),
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
    <div class="flex w-full flex-col gap-4">
      <UAlert
        color="info"
        variant="soft"
        icon="i-heroicons-key"
        :title="t('webauthn.info.title')"
        :description="t('webauthn.info.description')"
      />

      <section
        class="
          grid gap-4
          md:gap-8
        "
      >
        <UTable
          :columns="columns"
          :empty-state="{
            icon: 'i-heroicons-key',
            label: $i18n.t('empty.title'),
            description: t('empty.description'),
          }"
          :data="rows"
          :loading="loading"
        >
          <template #name-cell="{ row }">
            <div class="flex items-center gap-2">
              <UInput
                v-model="row.original.name"
                :name="row.original.name"
                size="sm"
                color="neutral"
                variant="none"
                :placeholder="row.original.name || t('unnamed_key')"
                :disabled="editId !== row.original.id"
                :loading="loading"
                :ui="{
                  base: '!p-0',
                }"
              >
                <template #trailing>
                  <UTooltip
                    v-if="row.original.name && editId === row.original.id"
                    :text="$i18n.t('save')"
                  >
                    <UButton
                      color="success"
                      variant="link"
                      icon="i-heroicons-check-20-solid"
                      :padded="false"
                      @click="onSave(row.original, row.original.name)"
                    />
                  </UTooltip>
                </template>
              </UInput>
              <UBadge
                v-if="row.original.is_passwordless"
                color="secondary"
                variant="soft"
                :label="t('passwordless')"
              />
            </div>
          </template>
          <template #type-cell="{ row }">
            <UBadge
              :color="getTypeColor(row.original.type)"
              variant="subtle"
            >
              {{ getTypeLabel(row.original.type) }}
            </UBadge>
          </template>
          <template #created_at-cell="{ row }">
            <span class="text-sm text-muted">
              {{ new Date(row.original.created_at * 1000).toLocaleString() }}
            </span>
          </template>
          <template #last_used_at-cell="{ row }">
            <span class="text-sm">
              <UBadge
                v-if="!row.original.last_used_at"
                color="neutral"
                variant="soft"
              >
                {{ $i18n.t('unused') }}
              </UBadge>
              <span v-else class="text-muted">
                {{ new Date(row.original.last_used_at * 1000).toLocaleString() }}
              </span>
            </span>
          </template>
          <template #actions-cell="{ row }">
            <UTooltip :text="$i18n.t('actions')">
              <LazyUDropdownMenu
                v-if="actionItems({
                  id: row.original.id,
                  name: row.original.name ?? '',
                  type: row.original.type,
                  created_at: row.original.created_at,
                  last_used_at: row.original.last_used_at ?? null,
                }).length > 0"
                :items="actionItems({
                  id: row.original.id,
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
                  size="sm"
                />
              </LazyUDropdownMenu>
            </UTooltip>
          </template>
        </UTable>
      </section>

      <div class="flex items-center justify-between pt-2">
        <span class="text-sm text-muted">
          {{ t('total') }}: {{ t('total_keys', { count: rows.length }) }}
        </span>
        <UButton
          :label="$i18n.t('add.title')"
          :to="localePath('account-2fa-webauthn-add')"
          icon="i-heroicons-plus"
          color="neutral"
          size="md"
          type="button"
        />
      </div>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  type_unspecified: Μη καθορισμένος τύπος
  webauthn:
    info:
      title: Κλειδιά Ασφαλείας WebAuthn
      description: Διαχειριστείτε τα κλειδιά ασφαλείας WebAuthn που χρησιμοποιείτε για έλεγχο ταυτότητας. Μπορείτε να χρησιμοποιήσετε υλικά κλειδιά ασφαλείας ή βιομετρικά στοιχεία του συστήματός σας.
  passwordless: Χωρίς κωδικό
  recovery_codes: Κωδικοί ανάκτησης
  unnamed_key: Ανώνυμο κλειδί
  total: Σύνολο
  total_keys: Δεν υπάρχουν κλειδιά | 1 κλειδί | {count} κλειδιά
  empty:
    description: Προσθέστε ένα κλειδί ασφαλείας για να ξεκινήσετε
</i18n>
