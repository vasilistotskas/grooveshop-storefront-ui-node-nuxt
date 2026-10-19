<script lang="ts" setup>
import type { BadgeProps, TableColumn, DropdownMenuItem } from '#ui/types'

const { getAuthenticators, deleteWebAuthnCredential, updateWebAuthnCredential } = useAllAuthAccount()
const localePath = useLocalePath()
const toast = useToast()
const { notify } = useApiError()
const { t, locale } = useI18n()

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
      title: ok ? t('success.title') : t('error.default'),
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

// Renaming edits a draft, not the row: "Edit" used to enable a borderless
// input that looked like the plain name, with a small check icon as the
// only save and no way back (owner review, 2026-10-16).
const draftName = ref('')

function startRename(id: number, name: string | undefined) {
  editId.value = id
  draftName.value = name ?? ''
}

function cancelRename() {
  editId.value = null
}

/** The row shows the new name once the API has kept it. */
async function onSave(id: number) {
  const name = draftName.value.trim()
  if (!name) return
  loading.value = true
  try {
    const ok = (await updateWebAuthnCredential({ id, name }))?.status === 200
    if (ok) {
      keys.value = keys.value?.map(k => (k.id === id ? { ...k, name } : k))
      editId.value = null
    }
    toast.add({ title: ok ? t('success.title') : t('error.default'), color: ok ? 'success' : 'error' })
  }
  catch (error) {
    notify('webside-webauthn:rename', error, { title: t('error.default') })
  }
  finally {
    loading.value = false
  }
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
    recovery_codes: t('recovery_codes'),
  }
  return labels[type] || type
}

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: t('name'),
  },
  {
    accessorKey: 'type',
    header: t('type'),
  },
  {
    accessorKey: 'created_at',
    header: t('ordering.created_at'),
  },
  {
    accessorKey: 'last_used_at',
    header: t('last_used_at'),
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
    label: t('edit.title'),
    icon: 'i-heroicons-pencil-20-solid',
    class: 'cursor-pointer',
    ui: {
      itemLeadingIcon: 'text-dark dark:text-white',
    },
    onSelect: () => startRename(row.id, row.name),
  })

  items.push({
    label: t('delete.title'),
    icon: 'i-heroicons-trash-20-solid',
    class: 'cursor-pointer',
    ui: {
      itemLeadingIcon: 'text-red-500 dark:text-red-500 hover:text-red-500 hover:dark:text-red-500',
    },
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
    <div class="w-full space-y-6">
      <UCard>
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
            :data="rows"
            :loading="loading"
          >
            <template #empty>
              <UEmpty
                icon="i-heroicons-key"
                :title="t('empty.title')"
                :description="t('empty.description')"
                variant="naked"
              />
            </template>
            <template #name-cell="{ row }">
              <div class="flex items-center gap-2">
                <form
                  v-if="editId === row.original.id"
                  class="flex items-center gap-2"
                  @submit.prevent="() => onSave(row.original.id)"
                >
                  <UInput
                    v-model="draftName"
                    :aria-label="t('rename_label')"
                    size="sm"
                    color="neutral"
                    autofocus
                    @keydown.esc="cancelRename"
                  />
                  <UButton
                    :label="t('save')"
                    :loading="loading"
                    :disabled="!draftName.trim()"
                    type="submit"
                    color="neutral"
                    size="sm"
                  />
                  <UButton
                    :label="t('cancel')"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    @click="cancelRename"
                  />
                </form>
                <span v-else>{{ row.original.name || t('unnamed_key') }}</span>
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
                <NuxtTime
                  :datetime="new Date(row.original.created_at * 1000)"
                  :locale="locale"
                  date-style="medium"
                  time-style="short"
                />
              </span>
            </template>
            <template #last_used_at-cell="{ row }">
              <span class="text-sm">
                <UBadge
                  v-if="!row.original.last_used_at"
                  color="neutral"
                  variant="soft"
                >
                  {{ t('unused') }}
                </UBadge>
                <span v-else class="text-muted">
                  <NuxtTime
                    :datetime="new Date(row.original.last_used_at * 1000)"
                    :locale="locale"
                    date-style="medium"
                    time-style="short"
                  />
                </span>
              </span>
            </template>
            <template #actions-cell="{ row }">
              <UTooltip :text="t('actions')">
                <!-- `UDropdownMenu`, not `UDropdownMenu`. Reka's
                   `useForwardExpose` reads `t.value.$el.nodeName` after
                   checking only that `$el` EXISTS as a key, and a Lazy
                   component's `$el` is null until it loads — so every
                   row threw "Cannot read properties of null (reading
                   'nodeName')" and the page hydrated with mismatches.
                   The lazy wrapper bought nothing either: the navbar
                   renders UDropdownMenu eagerly on every page. -->
                <UDropdownMenu
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
                </UDropdownMenu>
              </UTooltip>
            </template>
          </UTable>
        </section>

        <template #footer>
          <div class="flex items-center justify-between pt-2">
            <span class="text-sm text-muted">
              {{ t('total') }}: {{ t('total_keys', { count: rows.length }) }}
            </span>
            <UButton
              :label="t('add.title')"
              :to="localePath('account-2fa-webauthn-add')"
              icon="i-heroicons-plus"
              color="neutral"
              size="md"
              type="button"
            />
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  type_unspecified: Μη καθορισμένος τύπος
  webauthn:
    info:
      title: Κλειδιά Ασφαλείας WebAuthn
      description: Διαχειρίσου τα κλειδιά ασφαλείας WebAuthn που χρησιμοποιείς για έλεγχο ταυτότητας. Μπορείς να χρησιμοποιήσεις υλικά κλειδιά ασφαλείας ή βιομετρικά στοιχεία του συστήματός σου.
  passwordless: Χωρίς κωδικό
  recovery_codes: Κωδικοί ανάκτησης
  unnamed_key: Ανώνυμο κλειδί
  rename_label: Νέο όνομα κλειδιού
  total: Σύνολο
  total_keys: Δεν υπάρχουν κλειδιά | 1 κλειδί | {count} κλειδιά
  empty:
    title: Δεν υπάρχουν κλειδιά ασφαλείας
    description: Πρόσθεσε ένα κλειδί ασφαλείας για να ξεκινήσεις
en:
  type_unspecified: Type not specified
  webauthn:
    info:
      title: WebAuthn Security Keys
      description: Manage the WebAuthn security keys you sign in with. You can use hardware keys or your system's own biometrics.
  passwordless: Passwordless
  recovery_codes: Recovery codes
  unnamed_key: Unnamed key
  rename_label: New key name
  total: Total
  total_keys: "No keys | 1 key | {count} keys"
  empty:
    title: No security keys
    description: Add a security key to get started
</i18n>
