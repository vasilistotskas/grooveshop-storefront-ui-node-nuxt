<script lang="ts" setup>
const { t, locale } = useStoreI18n('components/Builder/ConflictDialog')
const { nodeLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()

/** Their saved document, read when the conflict appears, to say what differs and to load it. */
const theirs = shallowRef<DocumentDetail>()
const failed = ref(false)
const busy = ref(false)

const conflict = computed(() => autosave.conflict)

watch(() => conflict.value?.key, async (key) => {
  theirs.value = undefined
  failed.value = false
  if (!key) return
  try {
    theirs.value = await $api(`/api/builder/documents/${encodeURIComponent(key)}`)
  }
  catch (error) {
    log.error({ action: 'builder:conflict_read', document: key, error })
    failed.value = true
  }
}, { immediate: true })

/** The sections the two versions disagree on, by the name the outline gives them. */
const changed = computed(() => {
  const key = conflict.value?.key
  const mine = key ? store.opened[key]?.copy : undefined
  const theirDraft = ZodBuilderDraft.safeParse(theirs.value?.draft)
  const theirI18n = ZodBuilderOverlay.safeParse(theirs.value?.i18n)
  if (!mine || !theirDraft.success || !theirI18n.success) return []
  const theirCopy = { draft: theirDraft.data, i18n: theirI18n.data }
  return changedSections(mine, theirCopy).map((id) => {
    const node = mine.draft.sections[id] ?? theirCopy.draft.sections[id]!
    return nodeLabel(node)
  })
})

const who = computed(() => conflict.value?.updatedBy?.name ?? t('someone'))

async function keepMine(): Promise<void> {
  const key = conflict.value?.key
  if (!key) return
  busy.value = true
  try {
    await autosave.keepMine(key)
  }
  finally {
    busy.value = false
  }
}

function loadTheirs(): void {
  const key = conflict.value?.key
  if (!key || !theirs.value) return
  if (store.takeTheirs(key, theirs.value)) {
    autosave.settled(key)
  }
  else {
    failed.value = true
  }
}
</script>

<template>
  <UModal
    :open="conflict !== undefined"
    :dismissible="false"
    :close="false"
    :title="t('title', { name: who })"
    :description="t('description')"
  >
    <template #body>
      <p
        v-if="conflict"
        class="text-sm text-toned"
      >
        {{ t('savedAt') }}
        <NuxtTime
          :datetime="conflict.updatedAt"
          :locale="locale"
          date-style="medium"
          time-style="short"
        />
      </p>
      <p
        v-if="failed"
        class="text-sm text-toned"
      >
        {{ t('readFailed') }}
      </p>
      <template v-else-if="changed.length">
        <p class="mt-3 text-sm text-toned">
          {{ t('changed') }}
        </p>
        <ul class="mt-2 list-disc ps-5 text-sm">
          <li
            v-for="name in changed"
            :key="name"
          >
            {{ name }}
          </li>
        </ul>
      </template>
    </template>
    <template #footer>
      <div class="flex w-full flex-wrap justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          :label="t('loadTheirs')"
          :disabled="!theirs || busy"
          @click="loadTheirs"
        />
        <UButton
          :label="t('keepMine')"
          :loading="busy"
          @click="keepMine"
        />
      </div>
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  someone: Κάποιος άλλος
  title: "Η σελίδα αποθηκεύτηκε στο μεταξύ από: {name}"
  description: Οι τελευταίες σας αλλαγές δεν αποθηκεύτηκαν. Διαλέξτε ποια εκδοχή θα κρατήσετε.
  savedAt: "Αποθηκεύτηκε:"
  changed: "Οι δύο εκδοχές διαφέρουν σε:"
  readFailed: Δεν ήταν δυνατό να διαβαστεί η αποθηκευμένη εκδοχή. Μπορείτε να κρατήσετε τη δική σας.
  keepMine: Κράτησε τη δική μου
  loadTheirs: Φόρτωσε την αποθηκευμένη
en:
  someone: Someone else
  title: "{name} saved this page in the meantime"
  description: Your latest changes were not saved. Choose which version to keep.
  savedAt: "Saved:"
  changed: "The two versions differ in:"
  readFailed: The saved version could not be read. You can keep yours.
  keepMine: Keep mine
  loadTheirs: Load the saved one
</i18n>
