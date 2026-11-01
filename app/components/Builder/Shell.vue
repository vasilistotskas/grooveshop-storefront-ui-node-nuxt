<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Shell')

const { status, info, open, signOut } = useBuilderSession()

onMounted(open)
</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
  >
    <template #header>
      <span class="truncate font-semibold">
        {{ t('title') }}
      </span>
    </template>

    <template #footer="{ collapsed }">
      <div
        v-if="info"
        class="flex w-full items-center gap-2"
      >
        <UAvatar
          :alt="info.staff.name"
          size="sm"
        />
        <div
          v-if="!collapsed"
          class="min-w-0 flex-1"
        >
          <p class="truncate text-sm font-medium">
            {{ info.staff.name }}
          </p>
          <p class="text-muted truncate text-xs">
            {{ info.staff.role }}
          </p>
        </div>
        <UButton
          color="neutral"
          variant="ghost"
          icon="i-lucide-log-out"
          :aria-label="t('signOut')"
          @click="signOut"
        />
      </div>
    </template>
  </UDashboardSidebar>

  <UDashboardPanel>
    <template #header>
      <UDashboardNavbar :title="t('title')" />
    </template>

    <template #body>
      <UEmpty
        v-if="status === 'signedIn' && info"
        icon="i-lucide-layout-dashboard"
        :title="t('signedInAs', { name: info.staff.name })"
        :description="t('editorSoon')"
      />
      <UEmpty
        v-else-if="status === 'loading'"
        icon="i-lucide-loader-circle"
        :title="t('loading')"
      />
      <UEmpty
        v-else
        icon="i-lucide-lock"
        :title="t(`${status}.title`)"
        :description="t(`${status}.description`)"
      />
    </template>
  </UDashboardPanel>
</template>

<i18n lang="yaml">
el:
  title: Επεξεργαστής σελίδων
  signOut: Αποσύνδεση
  signedInAs: Συνδεδεμένος ως {name}
  editorSoon: Ο επεξεργαστής έρχεται σύντομα.
  loading: Σύνδεση…
  signedOut:
    title: Δεν είστε συνδεδεμένοι
    description: Ανοίξτε τον επεξεργαστή από τη διαχείριση του καταστήματος.
  invalidTicket:
    title: Ο σύνδεσμος δεν ισχύει πια
    description: Ο σύνδεσμος έχει λήξει ή έχει ήδη χρησιμοποιηθεί. Ανοίξτε ξανά τον επεξεργαστή από τη διαχείριση του καταστήματος.
  error:
    title: Η σύνδεση απέτυχε
    description: Δοκιμάστε ξανά σε λίγο.
en:
  title: Page editor
  signOut: Sign out
  signedInAs: Signed in as {name}
  editorSoon: The editor is coming soon.
  loading: Signing in…
  signedOut:
    title: You are not signed in
    description: Open the editor from your store's admin.
  invalidTicket:
    title: This link is no longer valid
    description: The link has expired or was already used. Open the editor again from your store's admin.
  error:
    title: Signing in failed
    description: Try again in a moment.
</i18n>
