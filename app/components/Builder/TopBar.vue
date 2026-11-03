<script lang="ts" setup>
import type { DropdownMenuItem } from '@nuxt/ui'

defineProps<{
  session: BuilderSessionInfo
}>()

const emit = defineEmits<{
  signOut: []
  openOutline: []
  openSettings: []
}>()

const { t } = useStoreI18n('components/Builder/TopBar')
const localePath = useLocalePath()
const tenantStore = useTenantStore()
const store = useBuilderEditorStore()

const accountItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: t('signOut'), icon: 'i-lucide-log-out', onSelect: () => emit('signOut') }],
])
</script>

<template>
  <!-- Two rows below `lg`: one row of every control is wider than a phone or a tablet. -->
  <header class="flex shrink-0 flex-wrap items-center gap-2 border-b border-default px-3 py-2 lg:h-14 lg:flex-nowrap lg:py-0">
    <UTooltip :text="t('exit')">
      <!-- A full page load: the storefront gets its own palette back. -->
      <UButton
        :to="localePath('/')"
        external
        icon="i-lucide-arrow-left"
        color="neutral"
        variant="ghost"
        :aria-label="t('exit')"
      />
    </UTooltip>
    <span class="hidden truncate font-semibold sm:inline">
      {{ tenantStore.storeName }}
    </span>
    <USeparator
      orientation="vertical"
      class="hidden h-6 sm:flex"
    />
    <UButton
      icon="i-lucide-list-tree"
      color="neutral"
      variant="ghost"
      class="lg:hidden"
      :aria-label="t('outline')"
      @click="() => emit('openOutline')"
    />
    <BuilderDocumentSwitcher class="min-w-0 flex-1 lg:w-64 lg:flex-none" />
    <BuilderLocaleSwitcher />

    <UPopover v-if="!store.canEdit">
      <UButton
        icon="i-lucide-eye"
        color="neutral"
        variant="soft"
        size="sm"
        :label="t('viewOnly.label')"
      />
      <template #content>
        <p class="max-w-xs p-3 text-sm">
          {{ t('viewOnly.reason', { role: t(`role.${session.staff.role}`) }) }}
        </p>
      </template>
    </UPopover>

    <div class="ms-auto flex items-center gap-1 max-lg:w-full max-lg:justify-end">
      <BuilderHistory />
      <BuilderVersionHistory v-if="store.status === 'ready'" />
      <BuilderPublish />

      <UButton
        icon="i-lucide-sliders-horizontal"
        color="neutral"
        variant="ghost"
        class="lg:hidden"
        :aria-label="t('settings')"
        @click="() => emit('openSettings')"
      />

      <UDropdownMenu
        :items="accountItems"
        :content="{ align: 'end' }"
      >
        <UButton
          color="neutral"
          variant="ghost"
          :aria-label="t('account', { name: session.staff.name })"
        >
          <UAvatar
            :alt="session.staff.name"
            size="sm"
          />
          <span class="hidden min-w-0 text-start lg:block">
            <span class="block truncate text-sm font-medium">{{ session.staff.name }}</span>
            <span class="block truncate text-xs text-muted">{{ t(`role.${session.staff.role}`) }}</span>
          </span>
        </UButton>
      </UDropdownMenu>
    </div>
  </header>
</template>

<i18n lang="yaml">
el:
  exit: Έξοδος στο κατάστημα
  outline: Δομή σελίδας
  settings: Ρυθμίσεις
  account: "Λογαριασμός: {name}"
  signOut: Αποσύνδεση
  viewOnly:
    label: Μόνο προβολή
    reason: "Ο ρόλος σας ({role}) επιτρέπει να βλέπετε τις σελίδες του καταστήματος, όχι να τις αλλάζετε. Για αλλαγές, απευθυνθείτε σε έναν ιδιοκτήτη ή διαχειριστή."
  role:
    staff: Προσωπικό
    admin: Διαχειριστής
    owner: Ιδιοκτήτης
    superuser: Διαχειριστής πλατφόρμας
en:
  exit: Exit to the store
  outline: Page outline
  settings: Settings
  account: "Account: {name}"
  signOut: Sign out
  viewOnly:
    label: View only
    reason: "Your role ({role}) can look at the store's pages but not change them. Ask an owner or an admin to make changes."
  role:
    staff: Staff
    admin: Admin
    owner: Owner
    superuser: Platform admin
</i18n>
