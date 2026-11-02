<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/History')
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()

/**
 * The icon of each save state, and its colour. The colour goes on the icon
 * only: the semantic colours are fills, too light to be text.
 */
const STATUS: Record<BuilderSaveState, { icon: string, tone: string }> = {
  saved: { icon: 'i-lucide-check', tone: 'text-success' },
  pending: { icon: 'i-lucide-circle-dot', tone: 'text-muted' },
  saving: { icon: 'i-lucide-loader-circle', tone: 'text-muted' },
  retrying: { icon: 'i-lucide-cloud-off', tone: 'text-warning' },
  conflict: { icon: 'i-lucide-users', tone: 'text-error' },
  invalid: { icon: 'i-lucide-circle-alert', tone: 'text-error' },
  signedOut: { icon: 'i-lucide-log-out', tone: 'text-error' },
  failed: { icon: 'i-lucide-circle-alert', tone: 'text-error' },
}

const status = computed(() => STATUS[autosave.overall])
</script>

<template>
  <div
    v-if="store.canEdit"
    class="flex items-center gap-1"
  >
    <UTooltip
      :text="t('undo')"
      :kbds="['meta', 'z']"
    >
      <UButton
        icon="i-lucide-undo-2"
        color="neutral"
        variant="ghost"
        :aria-label="t('undo')"
        :disabled="!store.canUndo"
        @click="() => { store.undo() }"
      />
    </UTooltip>
    <UTooltip
      :text="t('redo')"
      :kbds="['meta', 'shift', 'z']"
    >
      <UButton
        icon="i-lucide-redo-2"
        color="neutral"
        variant="ghost"
        :aria-label="t('redo')"
        :disabled="!store.canRedo"
        @click="() => { store.redo() }"
      />
    </UTooltip>
    <span
      role="status"
      class="ms-1 flex items-center gap-1 text-sm whitespace-nowrap text-toned"
    >
      <UIcon
        :name="status.icon"
        class="size-4 shrink-0"
        :class="[status.tone, autosave.overall === 'saving' ? 'animate-spin motion-reduce:animate-none' : '']"
      />
      <span class="max-md:sr-only">{{ t(`status.${autosave.overall}`) }}</span>
    </span>
    <UButton
      v-if="autosave.overall === 'failed'"
      color="neutral"
      variant="outline"
      size="sm"
      :label="t('retry')"
      @click="autosave.retry"
    />
  </div>
</template>

<i18n lang="yaml">
el:
  undo: Αναίρεση
  redo: Επανάληψη
  retry: Δοκιμάστε ξανά
  status:
    saved: Αποθηκεύτηκε
    pending: Αλλαγές προς αποθήκευση
    saving: Αποθήκευση…
    retrying: Χωρίς σύνδεση, νέα προσπάθεια
    conflict: Κάποιος άλλος αποθήκευσε
    invalid: Δεν αποθηκεύτηκε
    signedOut: Η σύνδεση έληξε
    failed: Η αποθήκευση απέτυχε
en:
  undo: Undo
  redo: Redo
  retry: Try again
  status:
    saved: Saved
    pending: Unsaved changes
    saving: Saving…
    retrying: Offline, retrying
    conflict: Someone else saved
    invalid: Not saved
    signedOut: Signed out
    failed: Saving failed
</i18n>
