<script lang="ts" setup>
import type { BadgeProps, TableColumn } from '#ui/types'

const { t } = useStoreI18n('components/variants/webside/Account/ProvidersManage')

const { cards, busy, disconnect, connect } = await useProviderAccounts({
  disconnected: account => ({ title: t('success.title', { provider: account.provider.name }), color: 'success' }),
})

const loading = computed(() => busy.value !== null)

function getProviderColor(providerName: string) {
  const colors: Record<string, Partial<BadgeProps['color']>> = {
    google: 'error',
    github: 'neutral',
    facebook: 'info',
    twitter: 'info',
    microsoft: 'info',
    apple: 'neutral',
    gitlab: 'warning',
    linkedin: 'info',
  }
  return colors[providerName.toLowerCase()] || 'primary'
}

const columns: TableColumn<ProviderCard>[] = [
  {
    accessorKey: 'name',
    header: t('provider'),
  },
  {
    id: 'account',
    header: t('account'),
  },
  {
    id: 'actions',
    header: '',
  },
]
</script>

<template>
  <WebsideAccountAreaSection
    v-if="cards.length"
    :title="t('providers.info.title')"
    :description="t('providers.info.description')"
    icon="i-heroicons-link"
  >
    <!-- ClientOnly: this table's rows come from the auth store,
         which `plugins/setup.ts` fills from a `watch(loggedIn)`
         that fires when nuxt-auth-utils re-fetches the session on
         `app:suspense:resolve` — the hydration boundary itself.
         The server therefore renders the empty state and the
         client renders the real rows in the same pass, which Vue
         reports as a hydration mismatch (measured: 1 row server,
         35 client). ClientOnly renders nothing on the server AND
         nothing during hydration, so the first client render
         matches by construction and the rows arrive as an
         ordinary update. These pages are authenticated and never
         cached or indexed, so there is no SSR content to lose. -->
    <ClientOnly>
      <UTable
        class="w-full"
        :columns="columns"
        :data="cards"
        :loading="loading"
      >
        <template #name-cell="{ row }">
          <div class="flex items-center gap-2">
            <AccountProviderIcon
              :provider-id="row.original.providerId"
              class="size-5"
            />
            <UBadge
              :color="getProviderColor(row.original.name)"
              variant="subtle"
              size="sm"
            >
              {{ row.original.name }}
            </UBadge>
          </div>
        </template>
        <template #account-cell="{ row }">
          <span
            v-if="row.original.kind === 'linked'"
            class="font-medium"
          >
            {{ row.original.account.display }}
          </span>
          <span
            v-else
            class="text-sm text-muted"
          >
            {{ t('not_connected') }}
          </span>
        </template>
        <template #actions-cell="{ row }">
          <UButton
            v-if="row.original.kind === 'linked'"
            :label="t('disconnect')"
            :aria-label="t('disconnect_named', { provider: row.original.name, account: row.original.account.display })"
            :loading="busy === row.original.key"
            :disabled="loading"
            icon="i-heroicons-trash-20-solid"
            color="error"
            variant="ghost"
            size="sm"
            @click="() => { if (row.original.kind === 'linked') disconnect(row.original.account) }"
          />
          <UButton
            v-else
            :label="t('connect')"
            :aria-label="t('connect_named', { provider: row.original.name })"
            :loading="busy === row.original.key"
            :disabled="loading"
            icon="i-heroicons-link"
            color="neutral"
            variant="outline"
            size="sm"
            @click="() => { if (row.original.kind === 'connect') connect(row.original.provider) }"
          />
        </template>
      </UTable>
    </ClientOnly>
  </WebsideAccountAreaSection>
</template>

<i18n lang="yaml">
el:
  provider: Πάροχος
  account: Λογαριασμός
  not_connected: Δεν έχει συνδεθεί
  connect: Σύνδεση
  connect_named: Σύνδεση λογαριασμού {provider}
  disconnect: Αποσύνδεση
  disconnect_named: Αποσύνδεση του λογαριασμού {provider} {account}
  success:
    title: Ο λογαριασμός {provider} αποσυνδέθηκε
  providers:
    info:
      title: Συνδεδεμένοι λογαριασμοί
      description: Διαχειρίσου τους λογαριασμούς τρίτων που έχεις συνδέσει με τον λογαριασμό σου. Μπορείς να αποσυνδέσεις οποιονδήποτε πάροχο οποιαδήποτε στιγμή.
en:
  provider: Provider
  account: Account
  not_connected: Not connected
  connect: Connect
  connect_named: Connect a {provider} account
  disconnect: Disconnect
  disconnect_named: Disconnect the {provider} account {account}
  success:
    title: Your {provider} account was disconnected
  providers:
    info:
      title: Connected accounts
      description: Manage the third-party accounts linked to yours. You can disconnect any of them at any time.
</i18n>
