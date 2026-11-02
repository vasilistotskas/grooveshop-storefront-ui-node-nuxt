<script lang="ts" setup>
const { t, locale } = useStoreI18n('components/Builder/RecoveryNotice')
const store = useBuilderEditorStore()
const host = useRequestURL().host

/**
 * Changes an earlier session kept in this browser and could not save (its
 * session ended, or the store could not be reached), read ONCE as each
 * document opens: what this session keeps while it runs is its own, never
 * offered back to it. Restoring makes them a change of this session
 * (undoable, saved); dismissing forgets them.
 */
const offered = ref<Record<string, BuilderRecovery>>({})
const seen = new Set<string>()

watch(() => Object.keys(store.opened), (keys) => {
  for (const key of keys) {
    if (seen.has(key)) continue
    seen.add(key)
    const recovery = readBuilderRecovery(host, key)
    if (recovery && !sameWorkingCopy(recovery.copy, store.opened[key]!.copy)) {
      offered.value = { ...offered.value, [key]: recovery }
    }
  }
}, { immediate: true })

const kept = computed(() => store.canEdit
  ? Object.entries(offered.value).map(([key, recovery]) => ({
      key,
      recovery,
      changedSince: recovery.revision !== store.opened[key]?.meta.draftRevision,
    }))
  : [])

function forget(key: string): void {
  clearBuilderRecovery(host, key)
  const { [key]: _, ...rest } = offered.value
  offered.value = rest
}

function restore(key: string, recovery: BuilderRecovery): void {
  store.change(key, recovery.copy)
  forget(key)
}
</script>

<template>
  <div
    v-if="kept.length"
    class="flex flex-col gap-2 border-b border-default p-3"
  >
    <UAlert
      v-for="{ key, recovery, changedSince } in kept"
      :key="key"
      icon="i-lucide-history"
      color="warning"
      variant="subtle"
      :title="t('title')"
      :actions="[
        { label: t('restore'), color: 'neutral', variant: 'solid', onClick: () => restore(key, recovery) },
        { label: t('discard'), color: 'neutral', variant: 'ghost', onClick: () => forget(key) },
      ]"
    >
      <template #description>
        {{ t('kept') }}
        <NuxtTime
          :datetime="recovery.keptAt"
          :locale="locale"
          date-style="medium"
          time-style="short"
        />.
        <template v-if="changedSince">
          {{ t('changedSince') }}
        </template>
      </template>
    </UAlert>
  </div>
</template>

<i18n lang="yaml">
el:
  title: Υπάρχουν αλλαγές που δεν αποθηκεύτηκαν
  kept: "Κρατήθηκαν σε αυτή τη συσκευή:"
  changedSince: Η σελίδα άλλαξε από τότε. Αν τις επαναφέρετε, αντικαθιστούν εκείνες τις αλλαγές.
  restore: Επαναφορά
  discard: Απόρριψη
en:
  title: There are changes that were not saved
  kept: "Kept on this device:"
  changedSince: The page has changed since. Restoring them replaces those changes.
  restore: Restore
  discard: Discard
</i18n>
