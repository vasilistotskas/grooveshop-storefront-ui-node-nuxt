/** Where reading a document's history stands. */
export type BuilderHistoryStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * How putting a version back as the draft ended:
 * - `restored`: the draft is the version's and the editor shows it;
 * - `unsaved`: the editor's own changes are not saved yet (or Django refused
 *   them), so nothing was touched: a restore would put a version over
 *   changes nobody has stored;
 * - `conflict`: someone else saved the document since this editor opened it;
 *   the editor's conflict dialog (`Builder/ConflictDialog`) is open on it;
 * - `unreadable`: the restored draft is in a format this editor cannot open;
 *   the document is restored at Django's, and opens again with the page;
 * - `failed`: Django could not be asked, or refused.
 */
export type BuilderRestoreResult = 'restored' | 'unsaved' | 'conflict' | 'unreadable' | 'failed'

/**
 * The version history of the document being edited: the saved and published
 * versions Django keeps, newest first, a page at a time. The draft (what the
 * editor is showing) and the live version are the document's own state
 * (`DocumentDetail`), not entries here: the panel draws them from the editor's
 * store. Nothing here is edited by the autosave; a version is only ever read,
 * named (`save`) or put back as the draft (`restore`).
 *
 * Browser only, like the editor's other stores.
 */
export const useBuilderHistoryStore = defineStore('builderHistory', () => {
  const documentKey = ref<string>()
  const versions = shallowRef<readonly VersionList[]>([])
  const status = ref<BuilderHistoryStatus>('idle')
  /** The pages of the history read so far, and how many there are. */
  const page = ref(0)
  const pages = ref(0)
  const loadingMore = ref(false)
  const hasMore = computed(() => page.value < pages.value)

  const versionsUrl = (key: string) => `/api/builder/documents/${encodeURIComponent(key)}/versions`

  /** Reads the first page of a document's history. A read overtaken by another document's is dropped. */
  async function load(key: string): Promise<void> {
    if (documentKey.value !== key) {
      documentKey.value = key
      versions.value = []
      page.value = 0
      pages.value = 0
    }
    status.value = versions.value.length ? status.value : 'loading'
    try {
      const first = await $api<PaginatedVersionListList>(versionsUrl(key))
      if (documentKey.value !== key) return
      versions.value = first.results
      page.value = 1
      pages.value = first.totalPages ?? 1
      status.value = 'ready'
    }
    catch (error) {
      if (documentKey.value !== key) return
      log.error({ action: 'builder:history_load', document: key, error })
      status.value = 'error'
    }
  }

  /** Reads the next page, older versions, below the ones shown. */
  async function more(): Promise<void> {
    const key = documentKey.value
    if (!key || !hasMore.value || loadingMore.value) return
    loadingMore.value = true
    try {
      const next = await $api<PaginatedVersionListList>(versionsUrl(key), { query: { page: page.value + 1 } })
      if (documentKey.value !== key) return
      versions.value = [...versions.value, ...next.results]
      page.value += 1
    }
    catch (error) {
      log.error({ action: 'builder:history_more', document: key, error })
      status.value = 'error'
    }
    finally {
      loadingMore.value = false
    }
  }

  /**
   * A version's content as a working copy this build can draw, for the
   * preview. `undefined` when it is in a format this editor cannot open.
   * Rejects when Django cannot be asked: the caller says so.
   */
  async function read(key: string, number: number): Promise<BuilderWorkingCopy | undefined> {
    const version = await $api<VersionDetail>(`${versionsUrl(key)}/${number}`)
    return readBuilderWorkingCopy(key, version.data, version.i18n)
  }

  /** A named save: the current draft kept as a version, with a note. Rejects when Django refuses. */
  async function save(key: string, note: string): Promise<void> {
    await $api(`/api/builder/documents/${encodeURIComponent(key)}/checkpoint`, { method: 'POST', body: { note } })
    await load(key)
  }

  /**
   * Puts a version back as the draft of the document. Always the draft,
   * never the live page: publishing is its own step. What is in the draft
   * now is saved first, and kept as a version of its own when it differs
   * from what is live (`beforeRestore` is its note), so a restore never
   * costs work: the draft it replaces stays one click away in this list.
   */
  async function restore(key: string, number: number, beforeRestore: string): Promise<BuilderRestoreResult> {
    const editor = useBuilderEditorStore()
    const autosave = useBuilderAutosaveStore()
    try {
      await autosave.save(key)
      const document = editor.opened[key]
      if (!document || autosave.stateOf(key) !== 'saved') return 'unsaved'
      if (document.meta.hasUnpublishedChanges) {
        await $api(`/api/builder/documents/${encodeURIComponent(key)}/checkpoint`, { method: 'POST', body: { note: beforeRestore } })
      }
      const meta = await $api<DocumentDetail>(`${versionsUrl(key)}/${number}/restore`, {
        method: 'POST',
        headers: { 'If-Match': String(document.meta.draftRevision) },
      })
      // Their history is not ours to undo into: the restored draft is a new base.
      if (!editor.takeTheirs(key, meta)) return 'unreadable'
      autosave.settled(key)
      await load(key)
      return 'restored'
    }
    catch (error) {
      // Someone saved the document in between: the editor's own conflict dialog decides.
      if (apiErrorBodyOf(error)?.code === 'revision_conflict' && autosave.reportConflict(key, apiErrorBodyOf(error))) return 'conflict'
      log.error({ action: 'builder:restore', document: key, version: number, error })
      return 'failed'
    }
  }

  return { documentKey, versions, status, hasMore, loadingMore, load, more, read, save, restore }
})
