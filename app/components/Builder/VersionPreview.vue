<script lang="ts" setup>
const props = defineProps<{
  /** The page document the version is of. */
  documentKey: string
  /** What the version is called in the list, e.g. "Published version 4". */
  title: string
  /** When it was kept. */
  at: string
  /** The version's content, as a copy the canvas can draw. */
  copy: BuilderWorkingCopy
  /** Whether this staff member may put it back. */
  canRestore: boolean
}>()

const emit = defineEmits<{
  restore: []
}>()

const open = defineModel<boolean>('open', { required: true })

const { t, locale } = useStoreI18n('components/Builder/VersionPreview')
const { documentLabel } = useBuilderLabels()

/** The body fills the panel edge to edge. */
const modalUi = { body: 'min-h-0 overflow-hidden p-0 sm:p-0' }
</script>

<template>
  <UModal
    v-model:open="open"
    fullscreen
    :title="props.title"
    :description="documentLabel(props.documentKey)"
    :ui="modalUi"
  >
    <template #body>
      <BuilderCanvas
        :document-key="props.documentKey"
        :preview="props.copy"
      />
    </template>
    <template #footer>
      <p class="me-auto text-sm text-toned">
        {{ t('kept') }}
        <NuxtTime
          :datetime="props.at"
          :locale="locale"
          date-style="medium"
          time-style="short"
        />
      </p>
      <UButton
        color="neutral"
        variant="outline"
        :label="t('close')"
        @click="() => { open = false }"
      />
      <UButton
        v-if="props.canRestore"
        icon="i-lucide-undo-2"
        :label="t('restore')"
        @click="() => emit('restore')"
      />
    </template>
  </UModal>
</template>

<i18n lang="yaml">
el:
  kept: Αποθηκεύτηκε
  close: Κλείσιμο
  restore: Επαναφορά ως πρόχειρο
en:
  kept: Kept
  close: Close
  restore: Restore as draft
</i18n>
