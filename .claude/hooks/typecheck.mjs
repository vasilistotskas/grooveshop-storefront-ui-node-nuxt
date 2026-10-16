/**
 * Stop hook: type-check when TS/Vue files were edited this session.
 *
 * - Reads the `.claude/.typecheck-pending` marker (written by track-typecheck.mjs).
 * - If absent: exit 0 silently (no edits, nothing to check).
 * - If `stop_hook_active` is true: exit 0, so a Stop hook can't loop.
 * - Otherwise run `pnpm run typecheck`. On failure, exit 2 with the compiler
 *   output on stderr so the errors have to be addressed before the turn ends.
 *
 * Uses `pnpm run typecheck` (= `nuxt typecheck`), not `vue-tsc --noEmit`.
 * `nuxt typecheck` catches template errors vue-tsc misses — notably Nuxt UI v4
 * typing UButton's onClick as `(e) => void | Promise<void>`, which fails an
 * inline `@click="open = true"` (the expression returns boolean). Running the
 * weaker gate here let those through. `pnpm run` also pins the workspace
 * toolchain; `npx` can resolve a different version from the registry.
 *
 * A timeout or a missing toolchain exits 0: a slow or half-installed machine
 * must not be able to wedge every turn.
 */
import { closeSync, existsSync, openSync, readFileSync, unlinkSync, writeSync } from 'node:fs'
import { execFileSync, execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'

// Two `nuxt typecheck` runs regenerate `.nuxt/` at the same time, and the one
// that reads it half written sees an empty typed-route map: dozens of
// `RouteLocationI18nInput<never>` errors that are not in the code. Other
// Claude sessions run the same command in this checkout. Two guards:
// - a lock file, created atomically, so two Stop hooks never run at once;
// - a process probe, so a hook also waits for a `pnpm typecheck` started by
//   hand, which takes no lock.
const WAIT_MS = 300_000
const POLL_MS = 3_000

// Each probe speaks its own regex dialect: PowerShell's -match is .NET, where
// `\s` is whitespace; pgrep takes a POSIX extended regex, where only the
// bracket class `[[:space:]]` is portable (`\s` is a GNU extension).
const WINDOWS_PATTERN = String.raw`nuxt(\.mjs)?[\s"]+typecheck`
const POSIX_PATTERN = String.raw`^node[[:space:]].*nuxt(\.mjs)?[[:space:]"]+typecheck`

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

function nuxtTypecheckRunning() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^node' -and $_.CommandLine -match '${WINDOWS_PATTERN}' -and $_.ProcessId -ne ${process.pid} } | Measure-Object).Count`,
      ], { encoding: 'utf8', stdio: 'pipe', timeout: 20_000 })
      return Number(out.trim()) > 0
    }
    execFileSync('pgrep', ['-f', POSIX_PATTERN], { stdio: 'pipe' })
    return true
  }
  catch {
    // pgrep exits 1 on no match; a failed probe must not block the turn.
    return false
  }
}

/** The holder's pid is written into the lock; a lock whose holder is gone is stale. */
function lockIsStale(lockPath) {
  try {
    const pid = Number(readFileSync(lockPath, 'utf8'))
    // An empty file is a holder between creating the lock and writing its pid.
    if (!pid) return false
    process.kill(pid, 0)
    return false
  }
  catch (err) {
    return err.code === 'ESRCH' || err.code === 'ENOENT'
  }
}

/** Atomic: `wx` fails with EEXIST when another hook holds the lock. */
function acquireLock(lockPath, deadline) {
  for (;;) {
    try {
      const fd = openSync(lockPath, 'wx')
      writeSync(fd, String(process.pid))
      closeSync(fd)
      return true
    }
    catch (err) {
      if (err.code !== 'EEXIST') {
        // Cannot create a lock at all (read-only tmp): fall back to the probe alone.
        return true
      }
      if (lockIsStale(lockPath)) {
        try { unlinkSync(lockPath) }
        catch { /* another hook removed it first */ }
        continue
      }
      if (Date.now() >= deadline) return false
      sleep(POLL_MS)
    }
  }
}

function releaseLock(lockPath) {
  try {
    if (Number(readFileSync(lockPath, 'utf8')) === process.pid) unlinkSync(lockPath)
  }
  catch {
    // Already gone; nothing to release.
  }
}

function runTypecheck(projectDir) {
  try {
    execSync('pnpm run typecheck', {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: 600_000,
      encoding: 'utf8',
      // 8 GB heap, like CI: the default limit aborts with exit 134 (OOM), not a type error.
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' },
    })
    return 0
  }
  catch (err) {
    if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM') {
      process.stderr.write('nuxt typecheck timed out after 10 minutes; run `pnpm typecheck` manually.\n')
      return 0
    }
    const output = `${err.stdout?.toString() || ''}${err.stderr?.toString() || ''}`.trim()
    if (/not recognized as an internal or external command|command not found/i.test(output)) {
      process.stderr.write('pnpm not found; skipping typecheck.\n')
      return 0
    }
    process.stderr.write('Type check failed. Fix the TypeScript errors below before stopping:\n\n')
    process.stderr.write(output || err.message || 'nuxt typecheck failed with no output.')
    return 2
  }
}

let input = {}
try {
  input = JSON.parse(readFileSync(0, 'utf8'))
}
catch {
  // A malformed payload should not block the turn.
}

if (input.stop_hook_active) {
  process.exit(0)
}

// Anchor on CLAUDE_PROJECT_DIR, not cwd, so this finds the marker
// track-typecheck.mjs wrote and runs pnpm in the project root.
const projectDir = resolve(process.env.CLAUDE_PROJECT_DIR || '.')
const markerPath = resolve(projectDir, '.claude', '.typecheck-pending')
if (!existsSync(markerPath)) {
  process.exit(0)
}

try {
  unlinkSync(markerPath)
}
catch {
  // If the marker survives, the next turn simply re-runs the check.
}

// One lock per checkout: worktrees have their own `.nuxt/` and may run in parallel.
// The workspace-root Stop hook (grooveshop/.claude/hooks/lib/repos.mjs) derives
// the same name, so a root session and a storefront session share it; Windows
// paths are case-insensitive, hence the lower-casing.
const lockKey = process.platform === 'win32' ? projectDir.toLowerCase() : projectDir
const checkoutId = createHash('sha256').update(lockKey).digest('hex').slice(0, 16)
const lockPath = resolve(tmpdir(), `claude-nuxt-typecheck-${checkoutId}.lock`)
const deadline = Date.now() + WAIT_MS

if (!acquireLock(lockPath, deadline)) {
  process.stderr.write('nuxt typecheck skipped: another hook held the lock for 5 minutes; run `pnpm typecheck` manually.\n')
  process.exit(0)
}

let exitCode = 0
try {
  let free = true
  while (nuxtTypecheckRunning()) {
    if (Date.now() >= deadline) {
      free = false
      break
    }
    sleep(POLL_MS)
  }
  if (free) {
    exitCode = runTypecheck(projectDir)
  }
  else {
    process.stderr.write('nuxt typecheck skipped: another run was still going after 5 minutes; run `pnpm typecheck` manually.\n')
  }
}
finally {
  releaseLock(lockPath)
}
process.exit(exitCode)
