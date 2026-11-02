<script lang="ts" setup>
const { t } = useStoreI18n('components/Builder/Outline')
const { blockLabel, groupLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()
const { documentKey, selected, select } = useBuilderEditorView()

/** One row of the outline, as `UTree` takes it. */
interface OutlineItem {
  id: string
  label: string
  icon: string
  /** The block's own name, when the row is named by the node's title instead. */
  blockName?: string
  hidden: boolean
  /** Django refused the last save because of this node. */
  problem: boolean
  children?: OutlineItem[]
}

/** A section of the page, and a block inside one. */
const SECTION_ICON = 'i-lucide-panel-top'
const BLOCK_ICON = 'i-lucide-square-dot'

function toItem(node: BuilderOutlineNode, problems: ReadonlySet<string>, depth = 0): OutlineItem {
  return {
    id: node.ref,
    label: node.title ?? blockLabel(node.blockType),
    icon: depth === 0 ? SECTION_ICON : BLOCK_ICON,
    ...(node.title !== undefined && { blockName: blockLabel(node.blockType) }),
    hidden: node.hidden,
    problem: problems.has(node.nodeId),
    ...(node.children.length > 0 && { children: node.children.map(child => toItem(child, problems, depth + 1)) }),
  }
}

function itemsOf(key: string): OutlineItem[] {
  const document = store.opened[key]
  const problems = new Set((autosave.saves[key]?.problems ?? []).flatMap(({ path }) => builderProblemNodeId(path) ?? []))
  return document ? builderOutline(key, document.copy.draft, builderEditorBlocks).map(node => toItem(node, problems)) : []
}

/** The trees, top to bottom as the storefront draws them: the groups above the page, the page, the groups below it. */
const trees = computed(() => {
  const group = ({ group, key }: { group: BuilderEditorGroup, key: string }) => ({ key, label: groupLabel(group), items: itemsOf(key) })
  const below = (entry: { group: BuilderEditorGroup }) => BUILDER_EDITOR_GROUPS_BELOW_PAGE.includes(entry.group)
  return [
    ...store.groups.filter(entry => !below(entry)).map(group),
    { key: documentKey.value, label: t('page'), items: itemsOf(documentKey.value) },
    ...store.groups.filter(below).map(group),
  ]
})

function find(items: readonly OutlineItem[], id: string): OutlineItem | undefined {
  for (const item of items) {
    const found = item.id === id ? item : find(item.children ?? [], id)
    if (found) return found
  }
  return undefined
}

/** The rows that hold the selected one, opened so it is in view. */
function ancestorsOf(items: readonly OutlineItem[], id: string): string[] {
  for (const item of items) {
    if (item.id === id) return []
    const below = ancestorsOf(item.children ?? [], id)
    if (below.length > 0 || item.children?.some(child => child.id === id)) return [item.id, ...below]
  }
  return []
}

const library = useBuilderLibraryStore()

/** Opens the library to add a section at the end of the document `key`. */
function addSection(key: string): void {
  library.open(key, { index: store.opened[key]?.copy.draft.order.length ?? 0 })
}

function onSelect(item: OutlineItem | undefined) {
  if (item) void select(item.id)
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
      <UTree
        v-if="tree.items.length > 0"
        :items="tree.items"
        :model-value="selected ? find(tree.items, selected) : undefined"
        :get-key="(item: OutlineItem) => item.id"
        :default-expanded="selected ? ancestorsOf(tree.items, selected) : []"
        :aria-label="tree.label"
        size="sm"
        @update:model-value="onSelect"
      >
        <template #item-label="{ item }">
          <span
            class="truncate"
            :class="item.hidden ? 'text-dimmed' : ''"
          >
            {{ item.label }}
          </span>
          <span
            v-if="item.blockName"
            class="sr-only"
          >, {{ item.blockName }}</span>
          <template v-if="item.problem">
            <UIcon
              name="i-lucide-circle-alert"
              class="ms-1 size-3.5 shrink-0 align-middle text-error"
            />
            <span class="sr-only">, {{ t('problem') }}</span>
          </template>
          <template v-if="item.hidden">
            <UIcon
              name="i-lucide-eye-off"
              class="ms-1 size-3.5 shrink-0 align-middle text-dimmed"
            />
            <span class="sr-only">, {{ t('hidden') }}</span>
          </template>
        </template>
      </UTree>
      <p
        v-else
        class="px-2 text-sm text-muted"
      >
        {{ t('empty') }}
      </p>
    </section>
  </nav>
</template>

<i18n lang="yaml">
el:
  label: Δομή σελίδας
  page: Αυτή η σελίδα
  hidden: Κρυφό
  problem: δεν αποθηκεύτηκε
  empty: Δεν έχει ενότητες ακόμη.
  add: "Προσθήκη ενότητας: {name}"
en:
  label: Page outline
  page: This page
  hidden: Hidden
  problem: not saved
  empty: No sections yet.
  add: "Add a section to {name}"
</i18n>
