<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Outline')
const { groupLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const { documentKey } = useBuilderEditorView()

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
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Δομή σελίδας
  page: Αυτή η σελίδα
  add: "Προσθήκη ενότητας: {name}"
en:
  label: Page outline
  page: This page
  add: "Add a section to {name}"
</i18n>
