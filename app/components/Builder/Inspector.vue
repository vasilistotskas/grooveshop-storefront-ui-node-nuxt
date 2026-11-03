<script lang="ts" setup>
import { DEFAULT_LOCALE } from '~~/i18n/locales'

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

// Where this staff member turns that feature on: the store admin's page for
// it, for a role that may change settings, asked once one is off (`enabled`
// only holds a request back, so the feature changing is what asks).
const { data: features } = useLazyApi('/api/builder/features', {
  enabled: computed(() => disabledFeature.value !== undefined && store.canEdit),
  watch: [disabledFeature],
})
const turnOnUrl = computed(() => disabledFeature.value ? features.value?.features[disabledFeature.value]?.turnOnUrl ?? undefined : undefined)

/** The way out of a refused save: remove the node, or (for whoever may) turn its feature on in the store admin. */
const featureActions = computed(() => {
  if (!store.canEdit || !disabledFeature.value) return []
  const feature = featureLabel(disabledFeature.value)
  return [
    { label: t('featureOff.remove'), color: 'warning' as const, variant: 'solid' as const, onClick: remove },
    ...(turnOnUrl.value
      ? [{ label: t('featureOff.turnOn', { feature }), color: 'warning' as const, variant: 'outline' as const, trailingIcon: 'i-lucide-external-link', to: turnOnUrl.value, target: '_blank' }]
      : []),
  ]
})

/** Where the selected node lives, as the outline names it: a section group, or this page. */
const context = computed(() => {
  const key = selection.value?.documentKey
  if (!key) return ''
  const group = BUILDER_EDITOR_GROUPS.find(name => key === builderDocumentKey('group', name))
  return group ? groupLabel(group) : t('page')
})

// While another language is edited, the pane says which, so a change is
// never taken for the page's own text.
const { locale } = useBuilderEditorView()
const translating = computed(() => locale.value === DEFAULT_LOCALE ? undefined : toUiLocales([locale.value])[0]?.name)
</script>

<template>
  <section
    v-if="selection"
    class="flex flex-col gap-4"
    aria-labelledby="builder-inspector-title"
  >
    <header>
      <div class="flex items-center justify-between gap-2">
        <p class="text-xs text-muted">
          {{ context }}
        </p>
        <UBadge
          v-if="translating"
          color="info"
          variant="subtle"
          size="sm"
          icon="i-lucide-languages"
          :label="t('translating', { language: translating })"
        />
      </div>
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
      :description="turnOnUrl ? t('featureOff.descriptionTurnOn') : t('featureOff.description')"
      :actions="featureActions"
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
  translating: "Μετάφραση: {language}"
  featureOff:
    title: "Χρειάζεται {feature}, που είναι κλειστό σε αυτό το κατάστημα"
    description: Η σελίδα δεν αποθηκεύεται όσο υπάρχει. Αφαιρέστε το, ή ζητήστε να ανοίξει η λειτουργία.
    descriptionTurnOn: Η σελίδα δεν αποθηκεύεται όσο υπάρχει. Αφαιρέστε το, ή ενεργοποιήστε τη λειτουργία στις ρυθμίσεις του καταστήματος και κάντε ξανά μια αλλαγή.
    remove: Αφαίρεση
    turnOn: "Ενεργοποιήστε {feature}"
  empty:
    title: Δεν έχει επιλεγεί ενότητα
    description: Διαλέξτε μια ενότητα ή ένα στοιχείο στη δομή της σελίδας για να αλλάξετε τις ρυθμίσεις του.
en:
  page: This page
  translating: "Translating: {language}"
  featureOff:
    title: "Needs {feature}, which is off for this store"
    description: The page can't be saved while it's here. Remove it, or have the feature turned on.
    descriptionTurnOn: The page can't be saved while it's here. Remove it, or turn the feature on in the store settings and make a change again.
    remove: Remove
    turnOn: "Turn on {feature}"
  empty:
    title: Nothing selected
    description: Pick a section or a block in the page outline to change its settings.
</i18n>
