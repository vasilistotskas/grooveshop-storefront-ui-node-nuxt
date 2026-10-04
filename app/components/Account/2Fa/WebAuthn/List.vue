<script lang="ts" setup>
/**
 * The shopper's passkeys and security keys, as the boards draw them: a
 * section with "Add passkey", one row per key — its name, whether it is
 * a passkey (signs in on its own) or a security key (a second factor),
 * when it was added and last used — renamed in place, or removed once
 * the shopper confirms (a key can be their only way to sign in, or the
 * factor that keeps two-step verification on). One change at a time.
 *
 * The rows are the auth store's authenticators, refreshed after every
 * change, so the Security page's two-step tile counts the same keys.
 * Allauth may answer a change with a re-authentication flow; the auth
 * plugin routes that, and the store refresh afterwards shows the result.
 */
const { t, locale } = useI18n()
const toast = useToast()
const localePath = useLocalePath()
const { deleteWebAuthnCredential, updateWebAuthnCredential } = useAllAuthAccount()
const authStore = useAuthStore()
const { authenticators } = storeToRefs(authStore)

const keys = computed(() =>
  (authenticators.value ?? []).filter(authenticator => authenticator.type === AuthenticatorType.WEBAUTHN),
)

const renaming = ref<number | null>(null)
const draftName = ref('')
const busy = ref<number | null>(null)
const confirming = ref<number | null>(null)

const epoch = (seconds: number) => new Date(seconds * 1000).toISOString()

function startRename(id: number, name: string | undefined) {
  renaming.value = id
  draftName.value = name ?? ''
}

async function change(id: number, request: () => Promise<{ status?: number } | undefined>, done: string) {
  busy.value = id
  try {
    const response = await request()
    if (response?.status !== 200) throw new Error(`status ${response?.status}`)
    toast.add({ title: done, color: 'success' })
    renaming.value = null
  }
  catch (error) {
    log.error({ action: 'webauthn:change', error })
    toast.add({ title: t('error'), color: 'error' })
  }
  finally {
    busy.value = null
    confirming.value = null
    await authStore.setupAuthenticators()
  }
}

const rename = (id: number) => {
  const name = draftName.value.trim()
  if (!name) return
  return change(id, () => updateWebAuthnCredential({ id, name }), t('renamed'))
}

const remove = (id: number) => change(id, () => deleteWebAuthnCredential({ authenticators: [id] }), t('removed'))
</script>

<template>
  <AccountSection
    :title="t('title')"
    :description="t('description')"
  >
    <template #actions>
      <UButton
        :label="t('add')"
        :to="localePath('account-2fa-webauthn-add')"
        icon="i-lucide-plus"
        color="neutral"
        size="sm"
      />
    </template>

    <p
      v-if="!keys.length"
      class="text-sm text-toned"
    >
      {{ t('empty') }}
    </p>
    <div
      v-else
      class="flex flex-col"
    >
      <div
        class="
          grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 border-b border-default pb-2
          text-xs font-semibold tracking-[0.06em] text-toned uppercase
          max-sm:hidden
        "
        aria-hidden="true"
      >
        <span>{{ t('columns.name') }}</span>
        <span>{{ t('columns.type') }}</span>
        <span>{{ t('columns.added') }}</span>
        <span>{{ t('columns.last_used') }}</span>
        <span class="w-24" />
      </div>
      <ul class="flex flex-col divide-y divide-default">
        <li
          v-for="key in keys"
          :key="key.id"
          class="
            flex flex-col gap-1 py-3 text-sm
            sm:grid sm:grid-cols-[2fr_1fr_1fr_1fr_auto] sm:items-center sm:gap-4
          "
        >
          <form
            v-if="renaming === key.id"
            class="flex items-center gap-2 sm:col-span-4"
            @submit.prevent="() => rename(key.id!)"
          >
            <UInput
              v-model="draftName"
              :aria-label="t('rename_label')"
              size="sm"
              class="min-w-0 flex-1"
              autofocus
            />
            <UButton
              :label="t('save')"
              :loading="busy === key.id"
              type="submit"
              color="neutral"
              size="sm"
            />
            <UButton
              :label="t('cancel')"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="() => { renaming = null }"
            />
          </form>
          <template v-else>
            <span class="font-medium text-highlighted">{{ key.name || t('unnamed') }}</span>
            <span class="text-toned">
              <span class="sr-only">{{ t('columns.type') }}: </span>{{ key.is_passwordless ? t('passkey') : t('security_key') }}
            </span>
            <span class="text-toned">
              <span class="sr-only">{{ t('columns.added') }}: </span>
              <NuxtTime
                :datetime="epoch(key.created_at)"
                :locale="locale"
                day="numeric"
                month="short"
                year="numeric"
              />
            </span>
            <span class="text-toned">
              <span class="sr-only">{{ t('columns.last_used') }}: </span>
              <NuxtTime
                v-if="key.last_used_at"
                :datetime="epoch(key.last_used_at)"
                :locale="locale"
                relative
                numeric="auto"
              />
              <template v-else>{{ t('never') }}</template>
            </span>
          </template>
          <div
            v-if="renaming !== key.id"
            class="flex min-w-24 flex-wrap items-center justify-end gap-1 max-sm:justify-start"
          >
            <template v-if="confirming === key.id">
              <span class="text-sm text-toned">{{ t('confirm_remove') }}</span>
              <UButton
                :label="t('remove')"
                :aria-label="t('confirm_remove_named', { name: key.name || t('unnamed') })"
                :loading="busy === key.id"
                :disabled="busy !== null"
                color="error"
                variant="soft"
                size="sm"
                @click="() => remove(key.id!)"
              />
              <UButton
                :label="t('cancel')"
                :disabled="busy !== null"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="() => { confirming = null }"
              />
            </template>
            <template v-else>
              <UButton
                :label="t('rename')"
                :aria-label="t('rename_named', { name: key.name || t('unnamed') })"
                :disabled="busy !== null"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="() => startRename(key.id!, key.name)"
              />
              <UButton
                :aria-label="t('remove_named', { name: key.name || t('unnamed') })"
                :disabled="busy !== null"
                icon="i-lucide-trash-2"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="() => { confirming = key.id! }"
              />
            </template>
          </div>
        </li>
      </ul>
    </div>
  </AccountSection>
</template>

<i18n lang="yaml">
el:
  title: Passkeys
  description: Σύνδεση με το πρόσωπο, το δακτυλικό αποτύπωμα ή το PIN της συσκευής σου.
  add: Νέο passkey
  empty: Δεν έχεις προσθέσει ακόμα passkey ή κλειδί ασφαλείας.
  columns:
    name: Όνομα
    type: Τύπος
    added: Προστέθηκε
    last_used: Τελευταία χρήση
  passkey: Passkey
  security_key: Κλειδί ασφαλείας
  unnamed: Κλειδί χωρίς όνομα
  never: Ποτέ
  rename: Μετονομασία
  rename_named: Μετονομασία του «{name}»
  rename_label: Νέο όνομα
  remove_named: Αφαίρεση του «{name}»
  remove: Αφαίρεση
  confirm_remove: Να αφαιρεθεί;
  confirm_remove_named: Επιβεβαίωση αφαίρεσης του «{name}»
  save: Αποθήκευση
  cancel: Άκυρο
  renamed: Το όνομα άλλαξε
  removed: Αφαιρέθηκε
  error: Η αλλαγή δεν έγινε. Δοκίμασε ξανά.
en:
  title: Passkeys
  description: Sign in with your face, fingerprint or device PIN.
  add: Add passkey
  empty: You have not added a passkey or security key yet.
  columns:
    name: Name
    type: Type
    added: Added
    last_used: Last used
  passkey: Passkey
  security_key: Security key
  unnamed: Unnamed key
  never: Never
  rename: Rename
  rename_named: Rename “{name}”
  rename_label: New name
  remove_named: Remove “{name}”
  remove: Remove
  confirm_remove: Remove it?
  confirm_remove_named: Confirm removing “{name}”
  save: Save
  cancel: Cancel
  renamed: Name changed
  removed: Removed
  error: The change did not go through. Please try again.
</i18n>
