<script lang="ts" setup>
import type { BadgeProps, TableColumn, DropdownMenuItem } from '#ui/types'

const emit = defineEmits(['disconnectThirdPartyProviderAccount'])

const {
  connectedThirdPartyProviderAccounts,
  disconnectThirdPartyProviderAccount,
} = useAllAuthAccount()
const toast = useToast()
const { t } = useI18n()

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
      title: t('success.title'),
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

function getProviderIcon(providerName: string): string {
  const icons: Record<string, string> = {
    google: 'i-logos-google-icon',
    github: 'i-logos-github-icon',
    facebook: 'i-logos-facebook',
    twitter: 'i-logos-twitter',
    microsoft: 'i-logos-microsoft-icon',
    apple: 'i-logos-apple',
    gitlab: 'i-logos-gitlab',
    linkedin: 'i-logos-linkedin-icon',
  }
  return icons[providerName.toLowerCase()] || 'i-heroicons-link'
}

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

const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: t('provider'),
  },
  {
    accessorKey: 'display',
    header: t('account'),
  },
  {
    accessorKey: 'uid',
    header: t('uid'),
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
      providerId: account.provider.id,
    }
  }) || []
})

const actionItems = (row: { uid: string, display: string, name: string, providerId: string }): DropdownMenuItem[][] => {
  const items: DropdownMenuItem[] = []
  items.push({
    label: t('disconnect'),
    icon: 'i-heroicons-trash-20-solid',
    class: 'cursor-pointer',
    ui: {
      itemLeadingIcon: 'text-red-500 dark:text-red-500 hover:text-red-500 hover:dark:text-red-500',
    },
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
    <!-- `min-w-0`, not `overflow-auto`: as a flex item beside the
         sidebar this column defaults to `min-width: auto` and cannot
         shrink below its table's min-content, which pushed the page
         100px past a 1280 viewport. Scrolling the whole column was
         the wrong lever anyway — UTable's own wrapper already scrolls
         horizontally, so the table scrolls inside the card instead of
         dragging the page with it. -->
    <div class="w-full min-w-0 space-y-6">
      <UCard>
        <UAlert
          color="info"
          variant="soft"
          icon="i-heroicons-link"
          :title="t('providers.info.title')"
          :description="t('providers.info.description')"
        />

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
            :data="data"
            :empty-state="{
              icon: 'i-heroicons-link-slash',
              label: t('providers.empty.title'),
              description: t('providers.empty.description'),
            }"
            :loading="loading"
          >
            <template #name-cell="{ row }">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="getProviderIcon(row.original.name)"
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
            <template #display-cell="{ row }">
              <span class="font-medium">
                {{ row.original.display }}
              </span>
            </template>
            <template #uid-cell="{ row }">
              <UTooltip :text="row.original.uid">
                <span class="font-mono text-sm text-muted">
                  {{ row.original.uid.length > 20 ? row.original.uid.substring(0, 20) + '...' : row.original.uid }}
                </span>
              </UTooltip>
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
                  v-if="actionItems(row.original).length > 0"
                  :items="actionItems(row.original)"
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
        </ClientOnly>

        <div class="flex items-center justify-between pt-2">
          <span class="text-sm text-muted">
            {{ t('providers.total', { count: data.length }) }}
          </span>
        </div>
      </UCard>
    </div>
  </div>
</template>

<i18n lang="yaml">
el:
  provider: Πάροχος
  account: Λογαριασμός
  providers:
    info:
      title: Συνδεδεμένοι Πάροχοι
      description: Διαχειρίσου τους λογαριασμούς τρίτων που έχεις συνδέσει με τον λογαριασμό σου. Μπορείς να αποσυνδέσεις οποιονδήποτε πάροχο οποιαδήποτε στιγμή.
    empty:
      title: Δεν έχεις συνδεθεί με κάποιον πάροχο
      description: Σύνδεσε λογαριασμούς τρίτων για ευκολότερη σύνδεση
    total: Κανένας συνδεδεμένος πάροχος | 1 Συνδεδεμένος πάροχος | {count} συνδεδεμένοι πάροχοι
en:
  provider: Provider
  account: Account
  providers:
    info:
      title: Connected Providers
      description: Manage the third-party accounts linked to yours. You can disconnect any of them at any time.
    empty:
      title: No providers connected
      description: Connect a third-party account to sign in more easily
    total: "No connected providers | 1 connected provider | {count} connected providers"
</i18n>
