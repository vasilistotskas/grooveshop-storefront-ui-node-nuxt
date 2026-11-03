/**
 * A document the editor holds: Django's envelope of the last save, the
 * working copy being edited, and the copy that save holds (so the editor
 * knows whether anything is left to save).
 */
export interface BuilderEditorDocument {
  meta: DocumentDetail
  copy: BuilderWorkingCopy
  saved: BuilderWorkingCopy
}

/**
 * Where the editor's documents stand:
 * - `notFound`: the store has no document of the key asked for;
 * - `unreadable`: a working copy is not one this build can open and save
 *   back whole (`ZodBuilderDraft`, `upgradeDraft`), so it is not opened;
 * - `error`: Django could not be asked.
 */
export type BuilderEditorStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'unreadable' | 'error'

/** A node moved among its siblings: to place `index` (0 is the first) of `count`. */
export interface BuilderEditorMove {
  documentKey: string
  nodeId: string
  index: number
  count: number
}

/** One step of the editor's undo history: a document before and after a change. */
interface BuilderHistoryEntry {
  key: string
  before: BuilderWorkingCopy
  after: BuilderWorkingCopy
  /** What the change edited (one setting of one node), so typing into it is one step. */
  coalesce?: string
  /** When the change was last extended, in milliseconds. */
  at: number
}

/**
 * The page editor's documents: the list of everything the store has, and
 * the working copies it has opened, which are the page being edited and the
 * section groups drawn around every page (`BUILDER_EDITOR_GROUPS`). Every
 * change goes through `change`, which records it for undo and hands the
 * document to the autosave (`useBuilderAutosaveStore`). Undo and redo span
 * every open document and survive saves.
 *
 * Browser only: the editor renders inside `<ClientOnly>`, so nothing here
 * travels in a server payload.
 */
export const useBuilderEditorStore = defineStore('builderEditor', () => {
  /** The signed-in staff member's role, which decides whether the editor changes anything. */
  const role = ref<BuilderStaffRole>()
  /**
   * Whether this staff member may edit, publish and schedule. STAFF open the
   * editor read-only: everything is browsable, nothing is offered that
   * writes (Django refuses those writes either way).
   */
  const canEdit = computed(() => role.value !== undefined && BUILDER_EDITING_ROLES.includes(role.value))

  const documents = ref<DocumentList[]>([])
  const opened = shallowRef<Readonly<Record<string, BuilderEditorDocument>>>({})
  const status = ref<BuilderEditorStatus>('idle')

  const undoStack = shallowRef<readonly BuilderHistoryEntry[]>([])
  const redoStack = shallowRef<readonly BuilderHistoryEntry[]>([])
  const canUndo = computed(() => canEdit.value && undoStack.value.length > 0)
  const canRedo = computed(() => canEdit.value && redoStack.value.length > 0)

  /** What the page switcher offers: the templates of the storefront's pages and the pages the store made. */
  const pages = computed(() => documents.value.filter(({ kind }) => kind === 'template' || kind === 'page'))

  /** The section groups the store has, in the order the storefront draws them. */
  const groups = computed(() => BUILDER_EDITOR_GROUPS.flatMap((group) => {
    const key = builderDocumentKey('group', group)
    return documents.value.some(document => document.key === key) ? [{ group, key }] : []
  }))

  async function read(key: string): Promise<BuilderEditorDocument | undefined> {
    const meta = await $api(`/api/builder/documents/${encodeURIComponent(key)}`)
    const copy = readBuilderWorkingCopy(meta.key, meta.draft, meta.i18n)
    return copy && { meta, copy, saved: copy }
  }

  function put(key: string, document: BuilderEditorDocument): void {
    opened.value = { ...opened.value, [key]: document }
  }

  /** The store's theme document, once opened: every page draws with it. */
  const theme = computed(() => opened.value[BUILDER_THEME_DOCUMENT])

  /**
   * Opens the document `key`, the store's section groups and its theme. The list is
   * read again each time, so a page another editor made appears; a working
   * copy already open is kept as it is.
   */
  async function open(key: string): Promise<void> {
    status.value = 'loading'
    try {
      documents.value = await $api('/api/builder/documents')
      if (!documents.value.some(document => document.key === key)) {
        status.value = 'notFound'
        return
      }
      const themeKeys = documents.value.some(document => document.key === BUILDER_THEME_DOCUMENT) ? [BUILDER_THEME_DOCUMENT] : []
      const wanted = [key, ...groups.value.map(group => group.key), ...themeKeys].filter(wantedKey => !opened.value[wantedKey])
      const fetched = await Promise.all(wanted.map(async wantedKey => [wantedKey, await read(wantedKey)] as const))
      const readable = fetched.filter((entry): entry is readonly [string, BuilderEditorDocument] => entry[1] !== undefined)
      if (readable.length < fetched.length) {
        status.value = 'unreadable'
        return
      }
      opened.value = { ...opened.value, ...Object.fromEntries(readable) }
      status.value = 'ready'
    }
    catch (error) {
      log.error({ action: 'builder:open', document: key, error })
      status.value = 'error'
    }
  }

  /**
   * Reads again what Django holds about the named documents, after a publish:
   * the list (what is published, what has changes) and each one's envelope.
   * The working copies are the editor's own and stay as they are.
   */
  async function refresh(keys: readonly string[]): Promise<void> {
    const [list, metas] = await Promise.all([
      $api('/api/builder/documents'),
      Promise.all(keys.map(async key => [key, await $api(`/api/builder/documents/${encodeURIComponent(key)}`)] as const)),
    ])
    documents.value = list
    for (const [key, meta] of metas) {
      const document = opened.value[key]
      if (document) put(key, { ...document, meta })
    }
  }

  function setCopy(key: string, copy: BuilderWorkingCopy): void {
    const document = opened.value[key]
    if (!document) return
    put(key, { ...document, copy })
    useBuilderAutosaveStore().schedule(key)
  }

  /**
   * Changes a document: recorded for undo (forgetting what was undone), then
   * saved. Changes with the same `coalesce` (one setting of one node) made
   * within `BUILDER_HISTORY_COALESCE_MS` of each other are one step, so undo
   * takes back a word typed, not a letter.
   */
  function change(key: string, next: BuilderWorkingCopy, { coalesce }: { coalesce?: string } = {}): void {
    const document = opened.value[key]
    if (!canEdit.value || !document || sameWorkingCopy(document.copy, next)) return
    const now = Date.now()
    const last = undoStack.value.at(-1)
    const extendsLast = coalesce !== undefined && last?.key === key && last.coalesce === coalesce
      && redoStack.value.length === 0 && now - last.at < BUILDER_HISTORY_COALESCE_MS
    undoStack.value = extendsLast
      ? [...undoStack.value.slice(0, -1), { ...last!, after: next, at: now }]
      : [...undoStack.value, { key, before: document.copy, after: next, at: now, ...(coalesce !== undefined && { coalesce }) }].slice(-BUILDER_HISTORY_LIMIT)
    redoStack.value = []
    setCopy(key, next)
  }

  /** The last node moved among its siblings, and where to: for the editor to announce. */
  const moved = shallowRef<BuilderEditorMove>()

  /**
   * Moves a node to place `to` among its siblings (0 is the first), as a
   * change, however it was asked for: the toolbar, a shortcut or a drag.
   * Nothing happens where it cannot go (`canMoveNode`).
   */
  function move(key: string, nodeId: string, to: number): void {
    const copy = opened.value[key]?.copy
    if (!canEdit.value || !copy || !canMoveNode(copy, nodeId, to)) return
    const next = moveNode(copy, nodeId, to)
    change(key, next)
    moved.value = { documentKey: key, nodeId, index: to, count: builderNodeSiblings(next, nodeId)!.length }
  }

  /** Takes back the last change, whichever document it was in. Answers that document's key. */
  function undo(): string | undefined {
    const entry = undoStack.value.at(-1)
    if (!canUndo.value || !entry) return undefined
    undoStack.value = undoStack.value.slice(0, -1)
    redoStack.value = [...redoStack.value, entry]
    setCopy(entry.key, entry.before)
    return entry.key
  }

  /** Makes the last undone change again. Answers that document's key. */
  function redo(): string | undefined {
    const entry = redoStack.value.at(-1)
    if (!canRedo.value || !entry) return undefined
    redoStack.value = redoStack.value.slice(0, -1)
    undoStack.value = [...undoStack.value, entry]
    setCopy(entry.key, entry.after)
    return entry.key
  }

  /** Records a save: Django's envelope, and the copy that save sent, which is now what the store holds. */
  function acceptSaved(key: string, meta: DocumentDetail, sent: BuilderWorkingCopy): void {
    const document = opened.value[key]
    if (document) put(key, { ...document, meta, saved: sent })
  }

  /**
   * Takes a document as someone else saved it: their copy replaces this
   * editor's, and the history of that document is dropped, because undoing
   * into a copy that is no longer the base of anything would bring their
   * changes back as ours. Answers whether their copy could be opened.
   */
  function takeTheirs(key: string, meta: DocumentDetail): boolean {
    const copy = readBuilderWorkingCopy(meta.key, meta.draft, meta.i18n)
    if (!copy) return false
    put(key, { meta, copy, saved: copy })
    undoStack.value = undoStack.value.filter(entry => entry.key !== key)
    redoStack.value = redoStack.value.filter(entry => entry.key !== key)
    return true
  }

  /** Points the next save of a document at another revision: "keep mine" after a conflict. */
  function rebase(key: string, revision: number): void {
    const document = opened.value[key]
    if (document) put(key, { ...document, meta: { ...document.meta, draftRevision: revision } })
  }

  return {
    role,
    canEdit,
    documents,
    opened,
    status,
    pages,
    groups,
    theme,
    canUndo,
    canRedo,
    open,
    refresh,
    change,
    moved,
    move,
    undo,
    redo,
    acceptSaved,
    takeTheirs,
    rebase,
  }
})
