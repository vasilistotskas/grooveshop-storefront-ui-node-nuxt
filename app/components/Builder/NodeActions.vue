<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/NodeActions')
const store = useBuilderEditorStore()
const { selection, move, toggleHidden, duplicate, remove } = useBuilderSelection()

const confirmingRemove = ref(false)

async function confirmRemove(): Promise<void> {
  confirmingRemove.value = false
  await remove()
}
</script>

<template>
  <div
    v-if="selection && store.canEdit"
    class="flex w-full flex-col gap-2"
  >
    <p
      class="truncate text-xs text-muted"
    >
      {{ selection.label }}
    </p>
    <div
      role="toolbar"
      :aria-label="t('label', { name: selection.label })"
      class="flex items-center gap-1"
    >
      <UTooltip
        :text="t('moveUp')"
        :kbds="['alt', 'arrowup']"
      >
        <UButton
          icon="i-lucide-arrow-up"
          color="neutral"
          variant="ghost"
          :aria-label="t('moveUp')"
          :disabled="!selection.canMoveUp"
          @click="() => move(-1)"
        />
      </UTooltip>
      <UTooltip
        :text="t('moveDown')"
        :kbds="['alt', 'arrowdown']"
      >
        <UButton
          icon="i-lucide-arrow-down"
          color="neutral"
          variant="ghost"
          :aria-label="t('moveDown')"
          :disabled="!selection.canMoveDown"
          @click="() => move(1)"
        />
      </UTooltip>
      <UTooltip :text="selection.canDuplicate ? t('duplicate') : t('duplicateLimit')">
        <UButton
          icon="i-lucide-copy"
          color="neutral"
          variant="ghost"
          :aria-label="t('duplicate')"
          :disabled="!selection.canDuplicate"
          @click="duplicate"
        />
      </UTooltip>
      <UTooltip :text="selection.hidden ? t('show') : t('hide')">
        <UButton
          :icon="selection.hidden ? 'i-lucide-eye' : 'i-lucide-eye-off'"
          color="neutral"
          variant="ghost"
          :aria-label="selection.hidden ? t('show') : t('hide')"
          :aria-pressed="selection.hidden"
          @click="toggleHidden"
        />
      </UTooltip>
      <UTooltip :text="t('remove')">
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          class="ms-auto"
          :aria-label="t('remove')"
          @click="() => { confirmingRemove = true }"
        />
      </UTooltip>
    </div>

    <UModal
      v-model:open="confirmingRemove"
      :title="t('confirm.title', { name: selection.label })"
      :description="t('confirm.description')"
    >
      <template #footer="{ close }">
        <div class="flex w-full justify-end gap-2">
          <UButton
            color="neutral"
            variant="outline"
            :label="t('confirm.cancel')"
            @click="close"
          />
          <UButton
            color="error"
            :label="t('confirm.remove')"
            @click="confirmRemove"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>

<i18n lang="yaml">
el:
  label: "Ενέργειες για: {name}"
  moveUp: Μετακίνηση πάνω
  moveDown: Μετακίνηση κάτω
  duplicate: Διπλότυπο
  duplicateLimit: Δεν χωράει άλλο ένα εδώ
  hide: Απόκρυψη από τους πελάτες
  show: Εμφάνιση στους πελάτες
  remove: Αφαίρεση
  confirm:
    title: "Αφαίρεση: {name};"
    description: Αφαιρείται μαζί με ό,τι περιέχει. Μπορείτε να το επαναφέρετε με την αναίρεση.
    cancel: Άκυρο
    remove: Αφαίρεση
en:
  label: "Actions for {name}"
  moveUp: Move up
  moveDown: Move down
  duplicate: Duplicate
  duplicateLimit: There is no room for another one here
  hide: Hide from shoppers
  show: Show to shoppers
  remove: Remove
  confirm:
    title: "Remove {name}?"
    description: It goes with everything inside it. Undo brings it back.
    cancel: Cancel
    remove: Remove
</i18n>
