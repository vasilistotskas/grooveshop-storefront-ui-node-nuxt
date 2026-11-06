import { z } from 'zod'

/** Unsaved changes kept in this browser when a save could not be made. */
export interface BuilderRecovery {
  /** The revision the changes were made against. */
  revision: number
  copy: BuilderWorkingCopy
  /** When they were kept (ISO 8601). */
  keptAt: string
}

const ZodBuilderRecovery = z.object({
  revision: z.int().min(0),
  copy: ZodBuilderDraftWrite,
  keptAt: z.iso.datetime({ offset: true }),
})

/** The storage key of one document's kept changes, per store host. */
const storageKey = (host: string, documentKey: string) => `${BUILDER_RECOVERY_STORAGE_PREFIX}:${host}:${documentKey}`

/**
 * Keeps a document's unsaved changes in this browser: what the editor does
 * when the staff session ends (or the store cannot be reached) before they
 * were saved, so the next session can offer them back. Browser storage may be
 * unavailable (a private window, storage turned off); then nothing is kept,
 * and the editor already says the changes are not saved.
 */
export function keepBuilderRecovery(host: string, documentKey: string, recovery: BuilderRecovery): void {
  try {
    localStorage.setItem(storageKey(host, documentKey), JSON.stringify(recovery))
  }
  catch (error) {
    log.warn({ action: 'builder:recovery_not_kept', document: documentKey, error })
  }
}

/**
 * The changes kept for a document, or `undefined` when there are none (or none
 * this editor can read). A copy can outlive the build that kept it, so it is
 * read like a stored draft (`readBuilderWorkingCopy`): restored as it was kept,
 * an older block's first save would be refused, with the copy already gone.
 */
export function readBuilderRecovery(host: string, documentKey: string): BuilderRecovery | undefined {
  let stored: string | null
  try {
    stored = localStorage.getItem(storageKey(host, documentKey))
  }
  catch {
    return undefined
  }
  if (stored === null) return undefined
  let raw: unknown
  try {
    raw = JSON.parse(stored)
  }
  catch {
    raw = undefined
  }
  const recovery = ZodBuilderRecovery.safeParse(raw)
  if (!recovery.success) return undefined
  const copy = readBuilderWorkingCopy(documentKey, recovery.data.copy.draft, recovery.data.copy.i18n)
  return copy && { ...recovery.data, copy }
}

/** Forgets the changes kept for a document: they were saved, restored or dismissed. */
export function clearBuilderRecovery(host: string, documentKey: string): void {
  try {
    localStorage.removeItem(storageKey(host, documentKey))
  }
  catch {
    // Nothing was kept where storage is unavailable.
  }
}
