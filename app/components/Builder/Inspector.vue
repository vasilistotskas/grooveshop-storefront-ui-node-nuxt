<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Inspector')
const { groupLabel } = useBuilderLabels()
const { selection } = useBuilderSelection()

/** Where the selected node lives, as the outline names it: a section group, or this page. */
const context = computed(() => {
  const key = selection.value?.documentKey
  if (!key) return ''
  const group = BUILDER_EDITOR_GROUPS.find(name => key === `group:${name}`)
  return group ? groupLabel(group) : t('page')
})
</script>

<template>
  <section
    v-if="selection"
    class="flex flex-col gap-4"
    aria-labelledby="builder-inspector-title"
  >
    <header>
      <p class="text-xs text-muted">
        {{ context }}
      </p>
      <h2
        id="builder-inspector-title"
        tabindex="-1"
        class="truncate text-base font-semibold"
      >
        {{ selection.label }}
      </h2>
    </header>
    <BuilderSettingsForm
      :key="`${selection.documentKey}/${selection.nodeId}`"
      :document-key="selection.documentKey"
      :node-id="selection.nodeId"
    />
  </section>
  <UEmpty
    v-else
    icon="i-lucide-mouse-pointer-click"
    variant="naked"
    :title="t('empty.title')"
    :description="t('empty.description')"
  />
</template>

<i18n lang="yaml">
el:
  page: Αυτή η σελίδα
  empty:
    title: Δεν έχει επιλεγεί ενότητα
    description: Διαλέξτε μια ενότητα ή ένα στοιχείο στη δομή της σελίδας για να αλλάξετε τις ρυθμίσεις του.
en:
  page: This page
  empty:
    title: Nothing selected
    description: Pick a section or a block in the page outline to change its settings.
</i18n>
