/**
 * Helpers shared by this repo's type-check hooks.
 *
 * A session can edit a linked worktree while CLAUDE_PROJECT_DIR stays on the main
 * clone, and several sessions can share one clone, so a marker belongs to one session
 * and one checkout. One file each: a marker written while Stop is taking them cannot
 * lose another checkout's, and the check runs after the take, so it sees that edit.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'

const MARKER_PREFIX = '.typecheck-pending-'
const MARKER_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000

/** The checkout holding `filePath`: the nearest ancestor with a `.git`. The file may not exist yet. */
export function checkoutOf(filePath) {
  for (let dir = dirname(resolve(filePath)); dir !== dirname(dir); dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir
  }
  return null
}

/** The directory holding the markers of the session's own project. */
function markerDir() {
  return resolve(process.env.CLAUDE_PROJECT_DIR || '.', '.claude')
}

/** This session's marker-name prefix. The session id comes from stdin, so keep it filename-safe. */
function sessionPrefix(session) {
  return `${MARKER_PREFIX}${String(session || 'unknown').replace(/[^\w-]/g, '_')}--`
}

/** Record that `checkout` has edits awaiting a type check in this session. */
export function markPending(session, checkout) {
  try {
    mkdirSync(markerDir(), { recursive: true })
    writeFileSync(join(markerDir(), `${sessionPrefix(session)}${basename(checkout)}`), checkout)
  }
  catch {
    // A missing marker only skips the check; never break the edit over it.
  }
}

/** Drop what sessions that ended long ago left behind. */
function sweepOldMarkers(names) {
  for (const name of names) {
    try {
      const path = join(markerDir(), name)
      if (Date.now() - statSync(path).mtimeMs > MARKER_MAX_AGE_MS) rmSync(path)
    }
    catch {
      // Left-over markers cost nothing but disk.
    }
  }
}

/** The checkouts awaiting a check in this session, clearing their markers. */
export function takePending(session) {
  let names
  try {
    names = readdirSync(markerDir()).filter(name => name.startsWith(MARKER_PREFIX))
  }
  catch {
    return []
  }
  sweepOldMarkers(names)
  const checkouts = []
  for (const name of names.filter(n => n.startsWith(sessionPrefix(session)))) {
    try {
      const path = join(markerDir(), name)
      const checkout = readFileSync(path, 'utf8')
      rmSync(path)
      // A worktree removed since the edit has nothing left to check.
      if (existsSync(checkout)) checkouts.push(checkout)
    }
    catch {
      // Taken by a concurrent Stop of this session.
    }
  }
  return checkouts
}
