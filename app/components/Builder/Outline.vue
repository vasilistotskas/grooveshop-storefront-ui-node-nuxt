<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Outline')
const { groupLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const { documentKey, panel, openPanel } = useBuilderEditorView()

/** The trees, top to bottom as the storefront draws them: the groups above the page, the page, the groups below it. */
const trees = computed(() => {
  const group = ({ group, key }: { group: BuilderEditorGroup, key: string }) => ({ key, label: groupLabel(group) })
  const below = (entry: { group: BuilderEditorGroup }) => BUILDER_EDITOR_GROUPS_BELOW_PAGE.includes(entry.group)
  return [
    ...store.groups.filter(entry => !below(entry)).map(group),
    { key: documentKey.value, label: t('page') },
    ...store.groups.filter(below).map(group),
  ]
})

const library = useBuilderLibraryStore()

/** Whether the open document has settings of its own (a page or a template: its search-engine copy, its heading). */
const hasPageSettings = computed(() => documentKey.value !== undefined && builderPageSettingFields(documentKey.value).length > 0)

/** Opens the library to add a section at the end of the document `key`. */
function addSection(key: string): void {
  library.open(key, { index: store.opened[key]?.copy.draft.order.length ?? 0 })
}
</script>

<template>
  <nav
    class="flex flex-col gap-4"
    :aria-label="t('label')"
  >
    <section
      v-for="tree in trees"
      :key="tree.key"
      :aria-labelledby="`outline-${tree.key}`"
    >
      <div class="flex items-center justify-between gap-2 px-2 pb-1">
        <h2
          :id="`outline-${tree.key}`"
          class="text-xs font-medium text-muted"
        >
          {{ tree.label }}
        </h2>
        <UTooltip
          v-if="store.canEdit"
          :text="t('add', { name: tree.label })"
        >
          <UButton
            icon="i-lucide-plus"
            color="neutral"
            variant="ghost"
            size="xs"
            :aria-label="t('add', { name: tree.label })"
            @click="() => addSection(tree.key)"
          />
        </UTooltip>
      </div>
      <BuilderOutlineTree
        :document-key="tree.key"
        :label="tree.label"
      />
    </section>
    <UButton
      v-if="hasPageSettings"
      icon="i-lucide-file-cog"
      color="neutral"
      :variant="panel === 'page' ? 'soft' : 'ghost'"
      :aria-pressed="panel === 'page'"
      :label="t('pageSettings')"
      class="justify-start"
      @click="() => openPanel(panel === 'page' ? undefined : 'page')"
    />
    <UButton
      v-if="store.theme"
      icon="i-lucide-palette"
      color="neutral"
      :variant="panel === 'theme' ? 'soft' : 'ghost'"
      :aria-pressed="panel === 'theme'"
      :label="t('theme')"
      class="justify-start"
      @click="() => openPanel(panel === 'theme' ? undefined : 'theme')"
    />
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Δομή σελίδας
  page: Αυτή η σελίδα
  add: "Προσθήκη ενότητας: {name}"
  pageSettings: "Ρυθμίσεις σελίδας: τίτλος και περιγραφή στην αναζήτηση"
  theme: "Θέμα: χρώματα, γωνίες, γραμματοσειρές"
en:
  label: Page outline
  page: This page
  add: "Add a section to {name}"
  pageSettings: "Page settings: title and description in search"
  theme: "Theme: colours, corners, fonts"
</i18n>
