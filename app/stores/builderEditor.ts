/** A document the editor holds: Django's envelope and the parsed working copy. */
export interface BuilderEditorDocument {
  meta: DocumentDetail
  draft: BuilderDocument
}

/**
 * Where the editor's documents stand:
 * - `notFound`: the store has no document of the key asked for;
 * - `unreadable`: a working copy is not a document this build can open
 *   (`ZodBuilderDraft`), so it is not opened rather than saved back mangled;
 * - `error`: Django could not be asked.
 */
export type BuilderEditorStatus = 'idle' | 'loading' | 'ready' | 'notFound' | 'unreadable' | 'error'

/**
 * The page editor's documents: the list of everything the store has, and
 * the working copies it has opened, which are the page being edited and the
 * section groups drawn around every page (`BUILDER_EDITOR_GROUPS`).
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

  /** What the page switcher offers: the templates of the storefront's pages and the pages the store made. */
  const pages = computed(() => documents.value.filter(({ kind }) => kind === 'template' || kind === 'page'))

  /** The section groups the store has, in the order the storefront draws them. */
  const groups = computed(() => BUILDER_EDITOR_GROUPS.flatMap((group) => {
    const key = `group:${group}`
    return documents.value.some(document => document.key === key) ? [{ group, key }] : []
  }))

  async function read(key: string): Promise<BuilderEditorDocument | undefined> {
    const meta = await $api(`/api/builder/documents/${encodeURIComponent(key)}`)
    const draft = ZodBuilderDraft.safeParse(meta.draft)
    if (!draft.success) {
      log.error({ action: 'builder:document_unreadable', document: key, issues: draft.error.issues.map(({ path, code }) => ({ path, code })) })
      return undefined
    }
    return { meta, draft: draft.data }
  }

  /**
   * Opens the document `key` and the store's section groups. The list is
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
      const wanted = [key, ...groups.value.map(group => group.key)].filter(wantedKey => !opened.value[wantedKey])
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

  return { role, canEdit, documents, opened, status, pages, groups, open }
})
