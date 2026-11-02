<script lang="ts" setup>
import { insertNodeAt, removeNode, useSortable } from '@vueuse/integrations/useSortable'
import type { SortableEvent } from 'sortablejs'

const props = defineProps<{
  documentKey: string
  /** What the tree is called: its section's heading. */
  label: string
}>()

const { t } = useStoreI18n('components/Builder/OutlineTree')
const { blockLabel } = useBuilderLabels()
const store = useBuilderEditorStore()
const autosave = useBuilderAutosaveStore()
const { selected, select } = useBuilderEditorView()

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
  /** Folded away while a sibling is dragged. */
  ui?: { item: string }
}

/** A section of the page, and a block inside one. */
const SECTION_ICON = 'i-lucide-panel-top'
const BLOCK_ICON = 'i-lucide-square-dot'

/** The attribute of a row's drag handle, which names the row's node (`builderNodeRef`). */
const HANDLE = 'data-builder-drag'

const nodes = computed(() => {
  const document = store.opened[props.documentKey]
  return document ? builderOutline(props.documentKey, document.copy.draft, builderEditorBlocks) : []
})

/** What the row being dragged may do, while one is. */
const drag = shallowRef<BuilderOutlineDrag & { ref: string }>()

function toItem(node: BuilderOutlineNode, problems: ReadonlySet<string>, depth = 0): OutlineItem {
  return {
    id: node.ref,
    label: node.title ?? blockLabel(node.blockType),
    icon: depth === 0 ? SECTION_ICON : BLOCK_ICON,
    ...(node.title !== undefined && { blockName: blockLabel(node.blockType) }),
    hidden: node.hidden,
    problem: problems.has(node.nodeId),
    ...(node.children.length > 0 && { children: node.children.map(child => toItem(child, problems, depth + 1)) }),
    ...(drag.value?.folded.has(node.ref) && { ui: { item: 'hidden' } }),
  }
}

const items = computed(() => {
  const problems = new Set((autosave.saves[props.documentKey]?.problems ?? []).flatMap(({ path }) => builderProblemNodeId(path) ?? []))
  return nodes.value.map(node => toItem(node, problems))
})

function find(list: readonly OutlineItem[], id: string): OutlineItem | undefined {
  for (const item of list) {
    const found = item.id === id ? item : find(item.children ?? [], id)
    if (found) return found
  }
  return undefined
}

/** The rows that hold the selected one, opened so it is in view. */
function ancestorsOf(list: readonly OutlineItem[], id: string): string[] {
  for (const item of list) {
    if (item.id === id) return []
    const below = ancestorsOf(item.children ?? [], id)
    if (below.length > 0 || item.children?.some(child => child.id === id)) return [item.id, ...below]
  }
  return []
}

function onSelect(item: OutlineItem | undefined) {
  if (item) void select(item.id)
}

// Dragging a row by its handle moves the node among its siblings: the drop
// is a move like the toolbar's, recorded for undo, saved and announced
// (`useBuilderEditorStore().move`). The tree is drawn flat (`nested: false`)
// so every row is a child of one list, which Sortable.js reorders.
const container = useTemplateRef<HTMLElement>('container')
const list = () => container.value?.querySelector<HTMLElement>('[role="tree"]') ?? null

const refOf = (row: Element | null | undefined) => row?.querySelector(`[${HANDLE}]`)?.getAttribute(HANDLE) ?? undefined

const reducedMotion = usePreferredReducedMotion()
const animation = () => reducedMotion.value === 'reduce' ? 0 : BUILDER_OUTLINE_DRAG_ANIMATION_MS

const { option } = useSortable(list, [], {
  watchElement: true,
  handle: `[${HANDLE}]`,
  draggable: 'li',
  // The pointer's own drag, not the browser's: the same on every browser and
  // on touch, and the dragged row's image is drawn above the drawer it is in.
  forceFallback: true,
  fallbackOnBody: true,
  // The row's image is a list item on its own in <body>: no list marker.
  fallbackClass: 'list-none',
  animation: animation(),
  // Where the row will land: an empty slot in the list (one class name: Sortable adds it as is).
  ghostClass: 'builder-drag-slot',
  onStart: (event: SortableEvent) => {
    const ref = refOf(event.item)
    const found = ref ? builderOutlineDrag(nodes.value, ref) : undefined
    drag.value = ref && found ? { ...found, ref } : undefined
  },
  onMove: (event: { related: Element }) => {
    const beside = refOf(event.related)
    return Boolean(beside && drag.value?.siblings.includes(beside))
  },
  onUpdate: (event: SortableEvent) => {
    const current = drag.value
    const order = [...event.from.children].map(refOf)
    // Sortable moved the row in the page; it goes back, and the outline is
    // drawn again from the document once the move changes it.
    removeNode(event.item)
    insertNodeAt(event.from, event.item, event.oldIndex!)
    const parsed = current && parseBuilderNodeRef(current.ref)
    if (current && parsed) store.move(parsed.documentKey, parsed.nodeId, builderOutlineDropIndex(current, current.ref, order.filter(ref => ref !== undefined)))
  },
  onEnd: () => {
    drag.value = undefined
  },
})

watch(reducedMotion, () => option('animation', animation()))
</script>

<template>
  <div
    v-if="items.length > 0"
    ref="container"
  >
    <UTree
      :items="items"
      :nested="false"
      :model-value="selected ? find(items, selected) : undefined"
      :get-key="(item: OutlineItem) => item.id"
      :default-expanded="selected ? ancestorsOf(items, selected) : []"
      :aria-label="label"
      size="sm"
      @update:model-value="onSelect"
    >
      <!-- The grip shows where a row is held: on hover, and always on a touch screen. -->
      <template #item-leading="{ item }">
        <span
          v-if="store.canEdit"
          :[HANDLE]="item.id"
          aria-hidden="true"
          class="relative size-4 shrink-0 cursor-grab touch-none active:cursor-grabbing"
        >
          <UIcon
            :name="item.icon"
            class="size-4 group-hover:invisible pointer-coarse:invisible"
          />
          <UIcon
            name="i-lucide-grip-vertical"
            class="invisible absolute inset-0 size-4 group-hover:visible pointer-coarse:visible"
          />
        </span>
        <UIcon
          v-else
          :name="item.icon"
          class="size-4 shrink-0"
        />
      </template>
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
  </div>
  <p
    v-else
    class="px-2 text-sm text-muted"
  >
    {{ t('empty') }}
  </p>
</template>

<style scoped>
:deep(.builder-drag-slot) {
  border-radius: var(--ui-radius);
  background-color: var(--ui-bg-accented);
}

:deep(.builder-drag-slot > *) {
  visibility: hidden;
}
</style>

<i18n lang="yaml">
el:
  hidden: Κρυφό
  problem: δεν αποθηκεύτηκε
  empty: Δεν έχει ενότητες ακόμη.
en:
  hidden: Hidden
  problem: not saved
  empty: No sections yet.
</i18n>
