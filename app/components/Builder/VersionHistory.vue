<script lang="ts" setup>
const { t, locale } = useStoreI18n('components/Builder/VersionHistory')
const toast = useToast()
const { notify } = useApiError()
const store = useBuilderEditorStore()
const history = useBuilderHistoryStore()
const { documentKey } = useBuilderEditorView()
const { documentLabel } = useBuilderLabels()

const ICONS = {
  draft: 'i-lucide-pencil-line',
  checkpoint: 'i-lucide-bookmark',
  publish: 'i-lucide-globe',
  restore: 'i-lucide-history',
} as const satisfies Record<BuilderHistoryRow['kind'], string>

const open = ref(false)

const rows = computed(() => builderHistoryRows(store.opened[documentKey.value]?.meta, history.versions))
const days = computed(() => groupBuilderHistoryByDay(rows.value))

watch([open, documentKey], ([isOpen, key]) => {
  if (isOpen) void history.load(key)
})

function rowTitle(row: BuilderHistoryRow): string {
  if (row.kind === 'draft') return t('draft')
  // A restore says which version it put back.
  if (row.kind === 'restore' && row.restoredFrom !== null) return t('kind.restoreFrom', { number: row.number, from: row.restoredFrom })
  return t(`kind.${row.kind}`, { number: row.number })
}

/** Looking at a version: what it holds is read when it is asked for, and drawn in a canvas of its own. */
const previewing = ref<{ row: BuilderHistoryRow, copy: BuilderWorkingCopy }>()
const previewOpen = ref(false)
const reading = ref<number>()

async function preview(row: BuilderHistoryRow): Promise<void> {
  if (row.number === undefined) return
  reading.value = row.number
  try {
    const copy = await history.read(documentKey.value, row.number)
    if (!copy) {
      toast.add({ title: t('unreadable.title'), description: t('unreadable.description'), color: 'warning', icon: 'i-lucide-file-warning' })
      return
    }
    previewing.value = { row, copy }
    previewOpen.value = true
  }
  catch (error) {
    log.error({ action: 'builder:version_read', document: documentKey.value, version: row.number, error })
    notify('builder:version-read', error, { title: t('readFailed') })
  }
  finally {
    reading.value = undefined
  }
}

/** Putting a version back asks first: it replaces the draft. */
const restoring = ref<BuilderHistoryRow>()
const confirmOpen = computed({
  get: () => restoring.value !== undefined,
  set: (value: boolean) => {
    if (!value) restoring.value = undefined
  },
})
const busy = ref(false)

async function restore(): Promise<void> {
  const row = restoring.value
  if (!row || row.number === undefined) return
  busy.value = true
  try {
    const result = await history.restore(documentKey.value, row.number, t('beforeRestore', { number: row.number }))
    if (result === 'restored') {
      toast.add({ title: t('restored', { title: rowTitle(row) }), icon: 'i-lucide-undo-2', color: 'success' })
      restoring.value = undefined
      previewOpen.value = false
    }
    else if (result === 'conflict') {
      // The conflict dialog takes over: nothing else is left open over it.
      restoring.value = undefined
      previewOpen.value = false
      open.value = false
    }
    else {
      toast.add({ title: t(`restoreFailed.${result}.title`), description: t(`restoreFailed.${result}.description`), color: 'error', icon: 'i-lucide-circle-alert' })
    }
  }
  finally {
    busy.value = false
  }
}

/** A named save: the draft kept as a version, with a note. */
const saveOpen = ref(false)
const note = ref('')

async function save(): Promise<void> {
  busy.value = true
  try {
    await history.save(documentKey.value, note.value.trim())
    toast.add({ title: t('saved'), icon: 'i-lucide-bookmark', color: 'success' })
    saveOpen.value = false
    note.value = ''
  }
  catch (error) {
    log.error({ action: 'builder:checkpoint', document: documentKey.value, error })
    notify('builder:checkpoint', error, { title: t('saveFailed.title'), fallback: t('saveFailed.description') })
  }
  finally {
    busy.value = false
  }
}

/** The body fills the panel edge to edge. */
const panelUi = { body: 'p-0 sm:p-0' }
</script>

<template>
  <USlideover
    v-model:open="open"
    :title="t('title')"
    :description="t('description', { page: documentLabel(documentKey) })"
    :ui="panelUi"
  >
    <UTooltip :text="t('title')">
      <UButton
        icon="i-lucide-history"
        color="neutral"
        variant="ghost"
        :aria-label="t('title')"
      />
    </UTooltip>

    <template #body>
      <div
        v-if="store.canEdit"
        class="border-b border-default p-4"
      >
        <UButton
          icon="i-lucide-bookmark-plus"
          color="neutral"
          variant="outline"
          block
          :label="t('save.open')"
          @click="() => { saveOpen = true }"
        />
      </div>

      <UEmpty
        v-if="history.status === 'loading'"
        loading
        variant="naked"
        :title="t('loading')"
      />
      <UEmpty
        v-else-if="history.status === 'error'"
        icon="i-lucide-cloud-off"
        variant="naked"
        :title="t('error.title')"
        :description="t('error.description')"
        :actions="[{ label: t('error.retry'), color: 'neutral', variant: 'outline', onClick: () => history.load(documentKey) }]"
      />
      <UEmpty
        v-else-if="!rows.length"
        icon="i-lucide-history"
        variant="naked"
        :title="t('empty.title')"
        :description="t('empty.description')"
      />
      <template v-else>
        <section
          v-for="day in days"
          :key="day.day"
          :aria-labelledby="`builder-history-${day.day}`"
        >
          <h3
            :id="`builder-history-${day.day}`"
            class="
              sticky top-0 z-10 border-b border-default bg-elevated px-4 py-2
              text-xs font-semibold text-toned
            "
          >
            <NuxtTime
              :datetime="day.at"
              :locale="locale"
              weekday="long"
              day="numeric"
              month="long"
              year="numeric"
            />
          </h3>
          <ul class="divide-y divide-default">
            <li
              v-for="row in day.rows"
              :key="row.id"
              class="flex items-start gap-3 px-4 py-3"
            >
              <UIcon
                :name="ICONS[row.kind]"
                class="mt-0.5 size-5 shrink-0 text-muted"
              />
              <div class="min-w-0 flex-1">
                <p class="flex flex-wrap items-center gap-2 text-sm font-medium">
                  {{ rowTitle(row) }}
                  <UBadge
                    v-if="row.live"
                    color="success"
                    variant="subtle"
                    size="sm"
                    :label="t('live')"
                  />
                  <UBadge
                    v-if="row.kind === 'draft'"
                    color="neutral"
                    variant="subtle"
                    size="sm"
                    :label="t('current')"
                  />
                </p>
                <p
                  v-if="row.note"
                  class="text-sm wrap-break-word text-toned"
                >
                  {{ row.note }}
                </p>
                <p class="text-xs text-muted">
                  <NuxtTime
                    :datetime="row.at"
                    :locale="locale"
                    time-style="short"
                  />
                  <template v-if="row.by">
                    · {{ t('by', { name: row.by.name }) }}
                  </template>
                </p>
              </div>
              <div
                v-if="row.number !== undefined"
                class="flex shrink-0 gap-1"
              >
                <UTooltip :text="t('preview')">
                  <UButton
                    icon="i-lucide-eye"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :loading="reading === row.number"
                    :aria-label="t('previewOf', { title: rowTitle(row) })"
                    @click="() => preview(row)"
                  />
                </UTooltip>
                <UTooltip
                  v-if="store.canEdit"
                  :text="t('restore.action')"
                >
                  <UButton
                    icon="i-lucide-undo-2"
                    color="neutral"
                    variant="ghost"
                    size="sm"
                    :aria-label="t('restore.of', { title: rowTitle(row) })"
                    @click="() => { restoring = row }"
                  />
                </UTooltip>
              </div>
            </li>
          </ul>
        </section>
      </template>

      <div
        v-if="history.hasMore"
        class="p-4"
      >
        <UButton
          color="neutral"
          variant="outline"
          block
          :loading="history.loadingMore"
          :label="t('more')"
          @click="history.more"
        />
      </div>
    </template>
  </USlideover>

  <BuilderVersionPreview
    v-if="previewing"
    v-model:open="previewOpen"
    :document-key="documentKey"
    :title="rowTitle(previewing.row)"
    :at="previewing.row.at"
    :copy="previewing.copy"
    :can-restore="store.canEdit"
    @restore="() => { restoring = previewing?.row }"
  />

  <UModal
    v-model:open="confirmOpen"
    :title="t('restore.title', { title: restoring ? rowTitle(restoring) : '' })"
    :description="t('restore.description')"
  >
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('cancel')"
        @click="() => { confirmOpen = false }"
      />
      <UButton
        icon="i-lucide-undo-2"
        :loading="busy"
        :label="t('restore.confirm')"
        @click="restore"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="saveOpen"
    :title="t('save.title')"
    :description="t('save.description')"
  >
    <template #body>
      <UFormField :label="t('save.note')">
        <UInput
          v-model="note"
          :maxlength="255"
          class="w-full"
          @keydown.enter="save"
        />
      </UFormField>
    </template>
    <template #footer>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('cancel')"
        @click="() => { saveOpen = false }"
      />
      <UButton
        icon="i-lucide-bookmark-plus"
        :loading="busy"
        :label="t('save.confirm')"
        @click="save"
      />
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  title: Ιστορικό εκδόσεων
  description: "Αποθηκευμένες και δημοσιευμένες εκδόσεις: {page}"
  draft: Πρόχειρο
  current: Τρέχον
  live: Ζωντανή
  kind:
    checkpoint: "Αποθηκευμένη έκδοση {number}"
    publish: "Δημοσιευμένη έκδοση {number}"
    restore: "Επαναφορά, έκδοση {number}"
    restoreFrom: "Έκδοση {number}: επαναφορά από την έκδοση {from}"
  by: "από {name}"
  loading: Φόρτωση του ιστορικού…
  more: Παλαιότερες εκδόσεις
  cancel: Άκυρο
  preview: Προεπισκόπηση
  previewOf: "Προεπισκόπηση: {title}"
  readFailed: Η έκδοση δεν άνοιξε
  unreadable:
    title: Αυτή η έκδοση δεν ανοίγει
    description: Γράφτηκε σε μορφή που αυτή η έκδοση του επεξεργαστή δεν διαβάζει.
  empty:
    title: Δεν υπάρχουν εκδόσεις ακόμη
    description: Οι εκδόσεις δημιουργούνται όταν δημοσιεύετε ή αποθηκεύετε μια έκδοση με όνομα. Οι αυτόματες αποθηκεύσεις δεν δημιουργούν εκδόσεις.
  error:
    title: Το ιστορικό δεν φορτώθηκε
    description: Δεν ήταν δυνατή η σύνδεση με το κατάστημα.
    retry: Δοκιμάστε ξανά
  save:
    open: Αποθήκευση έκδοσης με όνομα
    title: Αποθήκευση έκδοσης
    description: Κρατά το πρόχειρο όπως είναι τώρα, για να μπορείτε να επιστρέψετε σε αυτό.
    note: Σημείωση (προαιρετική)
    confirm: Αποθήκευση
  saved: Η έκδοση αποθηκεύτηκε
  saveFailed:
    title: Η έκδοση δεν αποθηκεύτηκε
    description: Το πρόχειρο δεν είναι έγκυρο ή το κατάστημα δεν απάντησε. Δοκιμάστε ξανά σε λίγο.
  beforeRestore: "Πριν την επαναφορά της έκδοσης {number}"
  restore:
    action: Επαναφορά ως πρόχειρο
    of: "Επαναφορά ως πρόχειρο: {title}"
    title: "Επαναφορά: {title}"
    description: Το πρόχειρο αντικαθίσταται από αυτή την έκδοση. Η ζωντανή σελίδα δεν αλλάζει μέχρι να δημοσιεύσετε. Το τρέχον πρόχειρο κρατιέται ως έκδοση, αν έχει αλλαγές.
    confirm: Επαναφορά
  restored: "Επαναφέρθηκε: {title}"
  restoreFailed:
    unsaved:
      title: Οι αλλαγές σας δεν έχουν αποθηκευτεί ακόμη
      description: Περιμένετε να ολοκληρωθεί η αποθήκευση και δοκιμάστε ξανά.
    unreadable:
      title: Η έκδοση επαναφέρθηκε, αλλά η σελίδα δεν ανοίγει
      description: Γράφτηκε σε μορφή που αυτή η έκδοση του επεξεργαστή δεν διαβάζει.
    failed:
      title: Η επαναφορά απέτυχε
      description: Δεν άλλαξε τίποτα. Δοκιμάστε ξανά σε λίγο.
en:
  title: Version history
  description: "Saved and published versions: {page}"
  draft: Draft
  current: Current
  live: Live
  kind:
    checkpoint: "Saved version {number}"
    publish: "Published version {number}"
    restore: "Restore, version {number}"
    restoreFrom: "Version {number}: restored from version {from}"
  by: "by {name}"
  loading: Loading the history…
  more: Older versions
  cancel: Cancel
  preview: Preview
  previewOf: "Preview: {title}"
  readFailed: The version didn't open
  unreadable:
    title: This version can't be opened
    description: It was written in a format this version of the editor can't read.
  empty:
    title: No versions yet
    description: Versions are made when you publish or save a named version. Autosaves don't make versions.
  error:
    title: The history didn't load
    description: The store couldn't be reached.
    retry: Try again
  save:
    open: Save a named version
    title: Save a version
    description: Keeps the draft as it is now, so you can come back to it.
    note: Note (optional)
    confirm: Save
  saved: Version saved
  saveFailed:
    title: The version wasn't saved
    description: The draft isn't valid, or the store didn't answer. Try again in a moment.
  beforeRestore: "Before restoring version {number}"
  restore:
    action: Restore as draft
    of: "Restore as draft: {title}"
    title: "Restore: {title}"
    description: The draft is replaced by this version. The live page doesn't change until you publish. The current draft is kept as a version if it has changes.
    confirm: Restore
  restored: "Restored: {title}"
  restoreFailed:
    unsaved:
      title: Your changes aren't saved yet
      description: Wait for saving to finish and try again.
    unreadable:
      title: Restored, but the page can't be opened
      description: It was written in a format this version of the editor can't read.
    failed:
      title: Restoring failed
      description: Nothing was changed. Try again in a moment.
</i18n>
