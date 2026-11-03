/** Where reading the share links stands. */
export type BuilderShareStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * The share-preview links of the store: the ones that still open, made from
 * the editor. A link freezes the SAVED drafts of the documents it names, so
 * making one first saves what the editor holds; the link's token is in the
 * answer that makes it and nowhere else.
 *
 * Browser only, like the editor's other stores.
 */
export const useBuilderShareStore = defineStore('builderShare', () => {
  const links = shallowRef<readonly PreviewLink[]>([])
  const status = ref<BuilderShareStatus>('idle')

  async function load(): Promise<void> {
    status.value = links.value.length ? status.value : 'loading'
    try {
      links.value = await $api<PreviewLink[]>('/api/builder/preview-links')
      status.value = 'ready'
    }
    catch (error) {
      log.error({ action: 'builder:share_load', error })
      status.value = 'error'
    }
  }

  /**
   * Makes a link to the drafts of `documents`. Answers `'unsaved'`, having
   * made nothing, while the editor's own changes to them are not saved (the
   * link would not show them). Rejects when Django refuses a draft or cannot
   * be asked: the caller says so.
   */
  async function create(documents: readonly string[], note: string): Promise<PreviewLinkCreated | 'unsaved'> {
    const autosave = useBuilderAutosaveStore()
    await Promise.all(documents.map(key => autosave.save(key)))
    if (documents.some(key => autosave.stateOf(key) !== 'saved')) return 'unsaved'
    const link = await $api<PreviewLinkCreated>('/api/builder/preview-links', {
      method: 'POST',
      body: { documents, ...(note && { note }) },
    })
    await load()
    return link
  }

  /** Ends a link at once. Rejects when Django cannot be asked. */
  async function revoke(id: number): Promise<void> {
    await $api(`/api/builder/preview-links/${id}`, { method: 'DELETE' })
    links.value = links.value.filter(link => link.id !== id)
  }

  return { links, status, load, create, revoke }
})
