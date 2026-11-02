<script lang="ts" setup>
const props = defineProps<{
  session: BuilderSessionInfo
}>()

const emit = defineEmits<{
  signOut: []
}>()

const { t } = useStoreI18n('components/Builder/Editor')

const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()
const toast = useToast()
const { documentKey, openDocument } = useBuilderEditorView()
const { selection, move } = useBuilderSelection()

/** The outline as a drawer, below the width that fits it beside the preview. */
const outlineOpen = ref(false)
/** The settings as a drawer, below the width that fits them beside the preview. */
const settingsOpen = ref(false)

// The library opens over everything: on a narrow screen the drawer it was
// opened from closes, so what is added lands in view of the preview.
const library = useBuilderLibraryStore()
watch(() => library.target, (target) => {
  if (!target) return
  outlineOpen.value = false
  settingsOpen.value = false
})
/** The preview fills its pane edge to edge; the states before it keep the panel's padding. */
const previewPanelUi = computed(() => store.status === 'ready' ? { body: 'gap-0 overflow-hidden p-0 sm:gap-0 sm:p-0' } : undefined)

watch(() => props.session.staff.role, (role) => {
  store.role = role
}, { immediate: true })
watch(documentKey, key => store.open(key), { immediate: true })

/** Undo and redo land on the document they changed, so the change is in view. */
async function step(direction: 'undo' | 'redo'): Promise<void> {
  const key = direction === 'undo' ? store.undo() : store.redo()
  if (key && parseBuilderDocumentKey(key).kind !== 'group' && key !== documentKey.value) await openDocument(key)
}

// Not while typing: a text field keeps its own undo (`usingInput` is off).
defineShortcuts(computed(() => ({
  meta_z: store.canUndo ? () => step('undo') : undefined,
  meta_shift_z: store.canRedo ? () => step('redo') : undefined,
  meta_y: store.canRedo ? () => step('redo') : undefined,
  alt_arrowup: selection.value?.canMoveUp && store.canEdit ? () => move(-1) : undefined,
  alt_arrowdown: selection.value?.canMoveDown && store.canEdit ? () => move(1) : undefined,
})))

// Leaving the page saves what waits for the autosave delay.
useEventListener(window, 'pagehide', () => autosave.flush())
useEventListener(document, 'visibilitychange', () => {
  if (document.visibilityState === 'hidden') autosave.flush()
})

// The staff token is never renewed: say so before it ends.
const { start: warnBeforeExpiry } = useTimeoutFn(() => {
  toast.add({ title: t('expiring.title'), description: t('expiring.description'), color: 'warning', icon: 'i-lucide-clock', duration: 0 })
}, () => Math.max(0, Date.parse(props.session.expiresAt) - Date.now() - BUILDER_SESSION_WARNING_MS), { immediate: false })
onMounted(warnBeforeExpiry)

watch(() => autosave.overall, (state) => {
  if (state === 'invalid') {
    toast.add({ title: t('invalid.title'), description: t('invalid.description'), color: 'error', icon: 'i-lucide-circle-alert' })
  }
  else if (state === 'failed') {
    toast.add({ title: t('failed.title'), description: t('failed.description'), color: 'error', icon: 'i-lucide-circle-alert' })
  }
})
</script>

<template>
  <BuilderTopBar
    :session="session"
    @sign-out="emit('signOut')"
    @open-outline="() => { outlineOpen = true }"
    @open-settings="() => { settingsOpen = true }"
  />

  <UDashboardGroup
    unit="px"
    :persistent="false"
    :ui="{ base: 'relative flex min-h-0 flex-1 overflow-hidden' }"
  >
    <UDashboardSidebar
      id="builder-outline"
      v-model:open="outlineOpen"
      resizable
      :toggle="false"
      :min-size="BUILDER_OUTLINE_PANE.min"
      :default-size="BUILDER_OUTLINE_PANE.default"
      :max-size="BUILDER_OUTLINE_PANE.max"
      :ui="{ root: 'min-h-0', header: 'h-12 justify-between', body: 'px-2 py-3' }"
    >
      <template #header>
        <h2 class="text-sm font-semibold">
          {{ t('outline.title') }}
        </h2>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="lg:hidden"
          :aria-label="t('outline.close')"
          @click="() => { outlineOpen = false }"
        />
      </template>
      <BuilderOutline v-if="store.status === 'ready'" />
      <template #footer>
        <BuilderNodeActions />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel
      id="builder-preview"
      :ui="previewPanelUi"
    >
      <template #header>
        <UAlert
          v-if="autosave.overall === 'signedOut'"
          icon="i-lucide-log-out"
          color="error"
          variant="subtle"
          :title="t('signedOut.title')"
          :description="t('signedOut.description')"
          class="rounded-none"
        />
        <BuilderRecoveryNotice v-if="store.status === 'ready'" />
      </template>
      <template #body>
        <BuilderCanvas
          v-if="store.status === 'ready'"
          :document-key="documentKey"
        />
        <div
          v-else
          class="flex flex-1 items-center justify-center"
          role="status"
        >
          <UEmpty
            v-if="store.status === 'idle' || store.status === 'loading'"
            loading
            variant="naked"
            :title="t('loading')"
          />
          <UEmpty
            v-else-if="store.status === 'notFound'"
            icon="i-lucide-file-question"
            :title="t('notFound.title')"
            :description="t('notFound.description')"
            :actions="documentKey === BUILDER_EDITOR_HOME_DOCUMENT
              ? []
              : [{ label: t('notFound.home'), color: 'neutral', variant: 'outline', onClick: () => openDocument(BUILDER_EDITOR_HOME_DOCUMENT) }]"
          />
          <UEmpty
            v-else-if="store.status === 'unreadable'"
            icon="i-lucide-file-warning"
            :title="t('unreadable.title')"
            :description="t('unreadable.description')"
          />
          <UEmpty
            v-else-if="store.status === 'error'"
            icon="i-lucide-cloud-off"
            :title="t('error.title')"
            :description="t('error.description')"
            :actions="[{ label: t('error.retry'), color: 'neutral', variant: 'outline', onClick: () => store.open(documentKey) }]"
          />
        </div>
      </template>
    </UDashboardPanel>

    <UDashboardSidebar
      id="builder-settings"
      v-model:open="settingsOpen"
      side="right"
      resizable
      :toggle="false"
      :min-size="BUILDER_SETTINGS_PANE.min"
      :default-size="BUILDER_SETTINGS_PANE.default"
      :max-size="BUILDER_SETTINGS_PANE.max"
      :ui="{ root: 'min-h-0', header: 'h-12 justify-between', body: 'px-4 py-3' }"
    >
      <template #header>
        <h2 class="text-sm font-semibold">
          {{ t('settings.title') }}
        </h2>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="sm"
          class="lg:hidden"
          :aria-label="t('settings.close')"
          @click="() => { settingsOpen = false }"
        />
      </template>
      <BuilderInspector v-if="store.status === 'ready'" />
    </UDashboardSidebar>
  </UDashboardGroup>

  <BuilderConflictDialog />
  <BuilderLibrary v-if="store.status === 'ready'" />
</template>

<i18n lang="yaml">
el:
  settings:
    title: Ρυθμίσεις
    close: Κλείσιμο των ρυθμίσεων
  expiring:
    title: Η σύνδεση λήγει σε λίγα λεπτά
    description: Οι αλλαγές σας αποθηκεύονται. Για να συνεχίσετε μετά, ανοίξτε ξανά τον επεξεργαστή από τη διαχείριση του καταστήματος.
  signedOut:
    title: Η σύνδεση έληξε
    description: Όσα δεν αποθηκεύτηκαν κρατήθηκαν σε αυτή τη συσκευή. Ανοίξτε ξανά τον επεξεργαστή από τη διαχείριση του καταστήματος για να τα επαναφέρετε.
  invalid:
    title: Η αλλαγή δεν αποθηκεύτηκε
    description: Το κατάστημα δεν τη δέχτηκε. Αναιρέστε την ή διορθώστε την ενότητα και θα αποθηκευτεί ξανά.
  failed:
    title: Η αποθήκευση απέτυχε
    description: Οι αλλαγές σας είναι ακόμη εδώ. Δοκιμάστε ξανά σε λίγο.
  outline:
    title: Δομή σελίδας
    close: Κλείσιμο της δομής
  loading: Άνοιγμα της σελίδας…
  notFound:
    title: Η σελίδα δεν βρέθηκε
    description: Το κατάστημα δεν έχει αυτή τη σελίδα. Μπορεί να διαγράφηκε.
    home: Άνοιγμα της αρχικής σελίδας
  unreadable:
    title: Η σελίδα δεν ανοίγει
    description: Γράφτηκε σε μορφή που αυτή η έκδοση του επεξεργαστή δεν διαβάζει. Δεν αλλάξαμε τίποτα σε αυτήν.
  error:
    title: Η σελίδα δεν φορτώθηκε
    description: Δεν ήταν δυνατή η σύνδεση με το κατάστημα.
    retry: Δοκιμάστε ξανά
en:
  settings:
    title: Settings
    close: Close the settings
  expiring:
    title: Your session ends in a few minutes
    description: Your changes are being saved. To carry on afterwards, open the editor again from your store's admin.
  signedOut:
    title: Your session has ended
    description: What was not saved is kept on this device. Open the editor again from your store's admin to restore it.
  invalid:
    title: The change was not saved
    description: The store refused it. Undo it, or fix the section, and it will be saved again.
  failed:
    title: Saving failed
    description: Your changes are still here. Try again in a moment.
  outline:
    title: Page outline
    close: Close the outline
  loading: Opening the page…
  notFound:
    title: Page not found
    description: The store has no such page. It may have been deleted.
    home: Open the home page
  unreadable:
    title: This page can't be opened
    description: It was written in a format this version of the editor can't read. Nothing in it was changed.
  error:
    title: The page didn't load
    description: The store couldn't be reached.
    retry: Try again
</i18n>
