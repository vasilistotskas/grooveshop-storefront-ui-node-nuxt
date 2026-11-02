<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Inspector')
const { groupLabel, featureLabel } = useBuilderLabels()
const { selection, remove } = useBuilderSelection()
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()

/**
 * The store feature the selected node needs and the store has off, when its
 * last save was refused for it (`feature_disabled`): the document cannot be
 * saved until the node is removed or the feature is turned on, so the
 * inspector says so on the node, with the way out.
 */
const disabledFeature = computed(() => {
  const current = selection.value
  if (!current) return undefined
  const refused = autosave.saves[current.documentKey]?.problems?.some(problem =>
    problem.code === 'feature_disabled' && builderProblemNodeId(problem.path) === current.nodeId)
  const document = store.opened[current.documentKey]
  const node = document ? findBuilderNode(document.copy.draft, current.nodeId) : undefined
  return refused && node ? builderEditorBlocks.get(builderBlockType(node))?.feature : undefined
})

/** Where the selected node lives, as the outline names it: a section group, or this page. */
const context = computed(() => {
  const key = selection.value?.documentKey
  if (!key) return ''
  const group = BUILDER_EDITOR_GROUPS.find(name => key === builderDocumentKey('group', name))
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
    <UAlert
      v-if="disabledFeature"
      color="warning"
      variant="subtle"
      icon="i-lucide-circle-off"
      :title="t('featureOff.title', { feature: featureLabel(disabledFeature) })"
      :description="t('featureOff.description')"
      :actions="store.canEdit ? [{ label: t('featureOff.remove'), color: 'warning', variant: 'solid', onClick: remove }] : []"
    />
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
  featureOff:
    title: "Χρειάζεται {feature}, που είναι κλειστό σε αυτό το κατάστημα"
    description: Η σελίδα δεν αποθηκεύεται όσο υπάρχει. Αφαιρέστε το, ή ζητήστε να ανοίξει η λειτουργία.
    remove: Αφαίρεση
  empty:
    title: Δεν έχει επιλεγεί ενότητα
    description: Διαλέξτε μια ενότητα ή ένα στοιχείο στη δομή της σελίδας για να αλλάξετε τις ρυθμίσεις του.
en:
  page: This page
  featureOff:
    title: "Needs {feature}, which is off for this store"
    description: The page can't be saved while it's here. Remove it, or have the feature turned on.
    remove: Remove
  empty:
    title: Nothing selected
    description: Pick a section or a block in the page outline to change its settings.
</i18n>
