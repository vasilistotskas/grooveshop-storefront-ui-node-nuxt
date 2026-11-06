/**
 * Helpers shared by this repo's type-check hooks.
 *
 * A session can edit a linked worktree while CLAUDE_PROJECT_DIR stays on the main
 * clone, and several sessions can share one clone, so the marker is per session and
 * names the checkouts to check.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, unlinkSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

/** The checkout holding `filePath`: the nearest ancestor with a `.git`. The file may not exist yet. */
export function checkoutOf(filePath) {
  for (let dir = dirname(resolve(filePath)); dir !== dirname(dir); dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir
  }
  return null
}

function markerPath(session) {
  // The session id comes from stdin, so keep it filename-safe.
  const id = String(session || 'unknown').replace(/[^\w-]/g, '_')
  return resolve(process.env.CLAUDE_PROJECT_DIR || '.', '.claude', `.typecheck-pending-${id}`)
}

/** Record that `checkout` has edits awaiting a type check in this session. */
export function markPending(session, checkout) {
  const marker = markerPath(session)
  try {
    if (existsSync(marker) && readFileSync(marker, 'utf8').split('\n').includes(checkout)) return
    mkdirSync(dirname(marker), { recursive: true })
    appendFileSync(marker, `${checkout}\n`)
  }
  catch {
    // A missing marker only skips the check; never break the edit over it.
  }
}

/** The checkouts awaiting a check in this session, clearing the marker. */
export function takePending(session) {
  const marker = markerPath(session)
  if (!existsSync(marker)) return []
  const checkouts = readFileSync(marker, 'utf8').split('\n').filter(Boolean)
  try {
    unlinkSync(marker)
  }
  catch {
    // If the marker survives, the next turn simply re-runs the check.
  }
  return checkouts
}
