/**
 * What the page editor shows, kept in the address (`BUILDER_EDITOR_QUERY`)
 * so a reload, a shared link or Back restores it: the document being
 * edited, the selected section or block, and the width the preview is
 * drawn at.
 *
 * Opening another document is a step in the history (Back returns to the
 * previous page); selecting a node replaces the current entry, so Back does
 * not walk through every click. A value that is not a document key or a node
 * reference is read as absent: the address is typed by people.
 */
export function useBuilderEditorView() {
  const route = useRoute()
  const router = useRouter()

  const queryValue = (name: string): string | undefined => {
    const value = route.query[name]
    return typeof value === 'string' ? value : undefined
  }

  const documentKey = computed(() => {
    const key = queryValue(BUILDER_EDITOR_QUERY.document)
    return key !== undefined && BUILDER_DOCUMENT_KEY_PATTERN.test(key) ? key : BUILDER_EDITOR_HOME_DOCUMENT
  })

  /** The selected node's reference (`builderNodeRef`), when one is selected. */
  const selected = computed(() => {
    const ref = queryValue(BUILDER_EDITOR_QUERY.node)
    return ref !== undefined && parseBuilderNodeRef(ref) ? ref : undefined
  })

  /** The width the preview is drawn at (`BUILDER_PREVIEW_DEVICES`); `full` fills the pane. */
  const device = computed<BuilderPreviewDevice>(() => {
    const value = queryValue(BUILDER_EDITOR_QUERY.device)
    return value !== undefined && Object.hasOwn(BUILDER_PREVIEW_DEVICES, value) ? value as BuilderPreviewDevice : 'full'
  })

  async function openDocument(key: string): Promise<void> {
    const { [BUILDER_EDITOR_QUERY.node]: _, ...query } = route.query
    await router.push({ query: { ...query, [BUILDER_EDITOR_QUERY.document]: key } })
  }

  async function select(ref: string | undefined): Promise<void> {
    const { [BUILDER_EDITOR_QUERY.node]: _, ...query } = route.query
    await router.replace({ query: ref === undefined ? query : { ...query, [BUILDER_EDITOR_QUERY.node]: ref } })
  }

  /** Draws the preview at another width; like a selection, it replaces the current entry. */
  async function setDevice(next: BuilderPreviewDevice): Promise<void> {
    const { [BUILDER_EDITOR_QUERY.device]: _, ...query } = route.query
    await router.replace({ query: next === 'full' ? query : { ...query, [BUILDER_EDITOR_QUERY.device]: next } })
  }

  return { documentKey, selected, device, openDocument, select, setDevice }
}
