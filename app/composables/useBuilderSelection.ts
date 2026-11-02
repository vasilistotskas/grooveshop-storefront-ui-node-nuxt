/**
 * The selected section or block, as the editor's controls act on it: which
 * document and node it is, what it is called, whether it is hidden, and the
 * structural changes it allows (move, duplicate, hide or show, remove), each
 * already applied through the editor store, so it is recorded for undo and
 * saved. `undefined` while nothing is selected, or the selected node is gone
 * (removed, or the address names one that does not exist).
 */
export function useBuilderSelection() {
  const store = useBuilderEditorStore()
  const { selected, select } = useBuilderEditorView()
  const { nodeLabel } = useBuilderLabels()

  const selection = computed(() => {
    const ref = selected.value
    const parsed = ref ? parseBuilderNodeRef(ref) : undefined
    const document = parsed ? store.opened[parsed.documentKey] : undefined
    const node = parsed && document ? findBuilderNode(document.copy.draft, parsed.nodeId) : undefined
    if (!parsed || !document || !node) return undefined
    const copy = document.copy
    const index = builderNodeSiblings(copy, parsed.nodeId)!.indexOf(parsed.nodeId)
    return {
      ...parsed,
      label: nodeLabel(node),
      hidden: node.disabled === true,
      index,
      canMoveUp: canMoveNode(copy, parsed.nodeId, index - 1),
      canMoveDown: canMoveNode(copy, parsed.nodeId, index + 1),
      canDuplicate: canDuplicateNode(copy, parsed.nodeId, builderEditorBlocks),
    }
  })

  const copyOf = (key: string) => store.opened[key]!.copy

  function move(delta: -1 | 1): void {
    const current = selection.value
    if (current) store.move(current.documentKey, current.nodeId, current.index + delta)
  }

  function toggleHidden(): void {
    const current = selection.value
    if (current) store.change(current.documentKey, setNodeHidden(copyOf(current.documentKey), current.nodeId, !current.hidden))
  }

  async function duplicate(): Promise<void> {
    const current = selection.value
    if (!current?.canDuplicate) return
    const { copy, nodeId } = duplicateNode(copyOf(current.documentKey), current.nodeId, () => crypto.randomUUID())
    store.change(current.documentKey, copy)
    await select(builderNodeRef(current.documentKey, nodeId))
  }

  async function remove(): Promise<void> {
    const current = selection.value
    if (!current) return
    store.change(current.documentKey, removeNode(copyOf(current.documentKey), current.nodeId))
    await select(undefined)
  }

  return { selection, move, toggleHidden, duplicate, remove }
}
