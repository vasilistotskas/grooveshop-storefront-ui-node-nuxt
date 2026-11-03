/**
 * Who else has the documents of the editor open: the answer of the last
 * heartbeat (`POST /api/builder/presence`). A hint, never a lock: a save is
 * still decided by the draft's revision (`useBuilderAutosaveStore`), so a
 * heartbeat that fails changes nothing but what the notice shows.
 *
 * Browser only, like the editor's other stores.
 */
export const useBuilderPresenceStore = defineStore('builderPresence', () => {
  const others = shallowRef<Readonly<Record<string, readonly PresenceEntry[]>>>({})
  /** Whether the last heartbeat failed, so a streak of failures is logged once. */
  let failing = false

  /** Says which documents are open, and takes in who else has them. */
  async function beat(documents: readonly string[]): Promise<void> {
    try {
      const answer = await $api<Presence>('/api/builder/presence', { method: 'POST', body: { documents } })
      others.value = answer.documents
      failing = false
    }
    catch (error) {
      // Nobody is known to be here while Django cannot say; the editor works on.
      others.value = {}
      if (!failing) log.warn({ tag: 'builder', message: 'presence heartbeat failed', error })
      failing = true
    }
  }

  /** The editor is left: lets go of every document. The request outlives the page. */
  async function leave(): Promise<void> {
    others.value = {}
    try {
      await $api('/api/builder/presence', { method: 'DELETE', keepalive: true })
    }
    catch {
      // Signed out or offline: the beats stopped, and the person lapses on their own.
    }
  }

  return { others, beat, leave }
})
