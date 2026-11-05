/**
 * Where a document's saving stands:
 * - `saved`: the store holds what the editor shows;
 * - `pending`: changed, waiting out the autosave delay;
 * - `saving`: a save is on its way;
 * - `retrying`: the store could not be reached, or could not check the save
 *   (503), so it is tried again after a wait;
 * - `conflict`: someone else saved the document in between;
 * - `invalid`: Django refused the document (`problems` says where);
 * - `signedOut`: the staff session ended; the changes are kept in this browser;
 * - `failed`: Django refused the save for another reason.
 */
export type BuilderSaveState = 'saved' | 'pending' | 'saving' | 'retrying' | 'conflict' | 'invalid' | 'signedOut' | 'failed'

/** Someone else's save, as Django's 409 states it. */
export type BuilderSaveConflict = Pick<BuilderRevisionConflict, 'currentRevision' | 'updatedBy' | 'updatedAt'>

interface DocumentSave {
  state: BuilderSaveState
  /** Failed attempts in a row, which set the next wait (`BUILDER_AUTOSAVE_RETRY_MS`). */
  attempt: number
  conflict?: BuilderSaveConflict
  problems?: readonly PublishProblem[]
}

const statusOf = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'statusCode' in error && typeof error.statusCode === 'number'
    ? error.statusCode
    : undefined

const dataOf = (error: unknown): unknown =>
  typeof error === 'object' && error !== null && 'data' in error ? error.data : undefined

/** How much of the editor's work is unsaved, for its status line: the most urgent state of any document. */
const URGENCY: readonly BuilderSaveState[] = ['conflict', 'signedOut', 'invalid', 'failed', 'retrying', 'saving', 'pending', 'saved']

/**
 * The editor's autosave. A change waits `BUILDER_AUTOSAVE_DELAY_MS`, then
 * the document's whole working copy is saved against the revision it was
 * made on (`If-Match`). One save per document is on its way at a time; a
 * change made meanwhile is saved right after. Nothing is lost:
 * - a save that gets no answer or a 5xx (the store unreachable, or Django
 *   unable to check it: 503) is tried again after each of
 *   `BUILDER_AUTOSAVE_RETRY_MS`, then waits for `retry` or the next change;
 * - a 409 stops saving that document until the staff member chooses
 *   (`keepMine` / the editor's `takeTheirs`), and a 401 until they sign in;
 * - a change no save took stays in this browser (`keepBuilderRecovery`) for
 *   the next session, also one made while saving is stopped;
 * - leaving the page saves what is pending, with `keepalive` so the request
 *   outlives it.
 */
export const useBuilderAutosaveStore = defineStore('builderAutosave', () => {
  const saves = ref<Record<string, DocumentSave>>({})
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const inFlight = new Set<string>()
  const host = useRequestURL().host

  const stateOf = (key: string): BuilderSaveState => saves.value[key]?.state ?? 'saved'

  /** The most urgent state across documents. */
  const overall = computed<BuilderSaveState>(() =>
    URGENCY.find(state => Object.values(saves.value).some(save => save.state === state)) ?? 'saved')

  /** The document waiting for a conflict choice, if any (one at a time). */
  const conflict = computed(() => {
    const entry = Object.entries(saves.value).find(([, save]) => save.state === 'conflict' && save.conflict)
    return entry && { key: entry[0], ...entry[1].conflict! }
  })

  function set(key: string, save: Partial<DocumentSave> & { state: BuilderSaveState }): void {
    saves.value = { ...saves.value, [key]: { attempt: 0, ...save } }
  }

  function wait(key: string, delay: number): void {
    clearTimeout(timers.get(key))
    timers.set(key, setTimeout(() => {
      timers.delete(key)
      void save(key)
    }, delay))
  }

  /** A document changed: save it once the editor has been still for the autosave delay. */
  function schedule(key: string): void {
    const state = stateOf(key)
    if (state === 'conflict' || state === 'signedOut') {
      keep(key)
      return
    }
    set(key, { state: inFlight.has(key) ? 'saving' : 'pending' })
    wait(key, BUILDER_AUTOSAVE_DELAY_MS)
  }

  /** Writes the document's working copy to this browser, for the next session. */
  function keep(key: string): void {
    const document = useBuilderEditorStore().opened[key]
    if (!document) return
    keepBuilderRecovery(host, key, {
      revision: document.meta.draftRevision,
      copy: document.copy,
      keptAt: new Date().toISOString(),
    })
  }

  /**
   * Saves a document now. `force` saves it even when it equals the copy of
   * its last save: after a conflict, the store holds someone else's copy, so
   * "keep mine" must send ours whatever it is.
   */
  async function save(key: string, options: { keepalive?: boolean, force?: boolean } = {}): Promise<void> {
    const editor = useBuilderEditorStore()
    const document = editor.opened[key]
    if (!document || inFlight.has(key)) return
    if (!options.force && sameWorkingCopy(document.copy, document.saved)) {
      set(key, { state: 'saved' })
      return
    }
    const sent = document.copy
    const attempt = saves.value[key]?.attempt ?? 0
    inFlight.add(key)
    set(key, { state: 'saving', attempt })
    try {
      // The route answers the saved document, or (on a refusal, thrown) Django's body.
      const meta = await $api<DocumentDetail>(`/api/builder/documents/${encodeURIComponent(key)}/draft`, {
        method: 'PUT',
        headers: { 'If-Match': String(document.meta.draftRevision) },
        body: sent,
        keepalive: options.keepalive,
      })
      editor.acceptSaved(key, meta, sent)
      clearBuilderRecovery(host, key)
      const now = editor.opened[key]!
      if (sameWorkingCopy(now.copy, now.saved)) set(key, { state: 'saved' })
      else schedule(key)
    }
    catch (error) {
      failed(key, error, attempt)
    }
    finally {
      inFlight.delete(key)
    }
  }

  function failed(key: string, error: unknown, attempt: number): void {
    const status = statusOf(error)
    const conflict = zBuilderRevisionConflict.safeParse(dataOf(error))
    const invalid = zBuilderDocumentInvalidError.safeParse(dataOf(error))
    keep(key)
    if (status === 409 && conflict.success) {
      set(key, { state: 'conflict', conflict: conflict.data })
    }
    else if (status === 400 && invalid.success) {
      set(key, { state: 'invalid', problems: invalid.data.errors })
    }
    else if (status === 401) {
      set(key, { state: 'signedOut' })
    }
    else if ((status === undefined || status >= 500) && attempt < BUILDER_AUTOSAVE_RETRY_MS.length) {
      // No answer, or a server that could not take the save (Django unreachable,
      // or unable to check it: 503): nothing was saved, so try again after a wait.
      set(key, { state: 'retrying', attempt: attempt + 1 })
      wait(key, BUILDER_AUTOSAVE_RETRY_MS[attempt]!)
    }
    else {
      // A refusal no retry changes, or a server still failing after every wait:
      // the changes stay (in the editor and in this browser) until the next try.
      log.error({ action: 'builder:save', document: key, status, error })
      set(key, { state: 'failed' })
    }
  }

  /** "Keep mine": save this editor's copy over the one someone else saved. */
  async function keepMine(key: string): Promise<void> {
    const conflictOf = saves.value[key]?.conflict
    if (!conflictOf) return
    useBuilderEditorStore().rebase(key, conflictOf.currentRevision)
    set(key, { state: 'pending' })
    await save(key, { force: true })
  }

  /**
   * Someone else saved the document since this editor read it, learned from
   * another request made against the revision it holds (a version restored):
   * the same state a refused save puts the document in, so the same dialog
   * asks which copy to keep. Answers whether `body` was Django's conflict.
   */
  function reportConflict(key: string, body: unknown): boolean {
    const conflict = zBuilderRevisionConflict.safeParse(body)
    if (!conflict.success) return false
    keep(key)
    set(key, { state: 'conflict', conflict: conflict.data })
    return true
  }

  /** The conflict is settled by taking their copy: nothing of ours is left to save. */
  function settled(key: string): void {
    clearTimeout(timers.get(key))
    timers.delete(key)
    clearBuilderRecovery(host, key)
    set(key, { state: 'saved' })
  }

  /** Tries again every document whose save failed: the staff member asked to. */
  function retry(): void {
    for (const [key, { state }] of Object.entries(saves.value)) {
      if (state === 'failed') {
        set(key, { state: 'pending' })
        wait(key, 0)
      }
    }
  }

  /** Saves everything waiting, now: the page is being left. */
  function flush(): void {
    for (const key of [...timers.keys()]) {
      clearTimeout(timers.get(key))
      timers.delete(key)
      void save(key, { keepalive: true })
    }
  }

  /**
   * Saves the named documents now, and waits for those saves to end: what a
   * publish needs first, since Django releases the drafts it holds. Answers
   * whether every one of them is saved; one that is retrying, refused, in
   * conflict or signed out is not, and is left as it is.
   */
  async function settle(keys: readonly string[]): Promise<boolean> {
    for (const key of keys) {
      if (!timers.has(key)) continue
      clearTimeout(timers.get(key))
      timers.delete(key)
      void save(key)
    }
    const busy = () => keys.some(key => stateOf(key) === 'pending' || stateOf(key) === 'saving')
    if (busy()) {
      await new Promise<void>((resolve) => {
        const stop = watch(busy, (still) => {
          if (still) return
          stop()
          resolve()
        })
      })
    }
    return keys.every(key => stateOf(key) === 'saved')
  }

  return { saves, overall, conflict, stateOf, schedule, save, keepMine, reportConflict, settled, retry, flush, settle }
})
