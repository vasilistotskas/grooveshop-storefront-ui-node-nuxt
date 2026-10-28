/**
 * Stop hook: type-check when TS/Vue files were edited this session.
 *
 * - Reads the `.claude/.typecheck-pending` marker (written by track-typecheck.mjs).
 * - If absent: exit 0 silently (no edits, nothing to check).
 * - If `stop_hook_active` is true: exit 0, so a Stop hook can't loop.
 * - Otherwise run `nuxt typecheck`. On failure, exit 2 with the compiler
 *   output on stderr so the errors have to be addressed before the turn ends.
 *
 * Runs `nuxt typecheck`, not `vue-tsc --noEmit`: it catches template errors
 * vue-tsc misses — notably Nuxt UI v4 typing UButton's onClick as
 * `(e) => void | Promise<void>`, which fails an inline `@click="open = true"`
 * (the expression returns boolean). The workspace's own `nuxt` binary is run
 * with this process's node, never through `pnpm`: pnpm can run a dependency
 * install when `node_modules` is out of sync, and a hook must never install.
 *
 * Everything runs inside one budget (`HOOK_BUDGET_MS`, below the Stop hook's
 * timeout in settings.json): a hook that outlives its timeout is killed after
 * the marker is already deleted, which loses the check silently. A timeout or a
 * skip (the lock or probe wait ran out) exits 0 and puts the marker back, so
 * the next turn checks again. A missing toolchain exits 0 without re-marking:
 * retrying cannot fix it.
 */
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync, writeSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'

// Two `nuxt typecheck` runs regenerate `.nuxt/` at the same time, and the one
// that reads it half written sees an empty typed-route map: dozens of
// `RouteLocationI18nInput<never>` errors that are not in the code. Other
// Claude sessions run the same command in this checkout. Two guards:
// - a lock file, created atomically, so two Stop hooks never run at once;
// - a process probe, so a hook also waits for a `pnpm typecheck` started by
//   hand, which takes no lock.
const WAIT_MS = 300_000
const POLL_MS = 3_000
// Must stay below the Stop hook's `timeout` in settings.json (660 s). A poll
// can overrun by one probe, which the typecheck budget reserves for.
const HOOK_BUDGET_MS = 630_000
const PROBE_TIMEOUT_MS = 20_000
const MIN_TYPECHECK_MS = 120_000

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
      ], { encoding: 'utf8', stdio: 'pipe', timeout: PROBE_TIMEOUT_MS })
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
        try {
          unlinkSync(lockPath)
        }
        catch {
          // Another hook removed it first.
        }
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

/** Puts the marker back, so a check that did not finish runs again next turn. */
function markPending(markerPath) {
  try {
    mkdirSync(dirname(markerPath), { recursive: true })
    writeFileSync(markerPath, String(Date.now()))
  }
  catch {
    // Without the marker the next turn skips the check; nothing more to do.
  }
}

/** Returns the exit code, or null when the run timed out (the caller re-marks). */
function runTypecheck(projectDir, timeoutMs) {
  const nuxtBin = resolve(projectDir, 'node_modules', 'nuxt', 'bin', 'nuxt.mjs')
  if (!existsSync(nuxtBin)) {
    process.stderr.write('nuxt is not installed in this checkout; skipping typecheck.\n')
    return 0
  }
  try {
    execFileSync(process.execPath, [nuxtBin, 'typecheck'], {
      cwd: projectDir,
      stdio: 'pipe',
      timeout: timeoutMs,
      encoding: 'utf8',
      // 8 GB heap, like CI: the default limit aborts with exit 134 (OOM), not a type error.
      env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' },
    })
    return 0
  }
  catch (err) {
    if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM') {
      process.stderr.write(`nuxt typecheck timed out after ${Math.round(timeoutMs / 1000)} s; it will run again next turn.\n`)
      return null
    }
    const output = `${err.stdout?.toString() || ''}${err.stderr?.toString() || ''}`.trim()
    process.stderr.write('Type check failed. Fix the TypeScript errors below before stopping:\n\n')
    process.stderr.write(output || err.message || 'nuxt typecheck failed with no output.')
    return 2
  }
}

const startedAt = Date.now()
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
// track-typecheck.mjs wrote and runs nuxt in the project root.
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
const deadline = startedAt + WAIT_MS

if (!acquireLock(lockPath, deadline)) {
  markPending(markerPath)
  process.stderr.write('nuxt typecheck skipped: another hook held the lock for 5 minutes; it will run again next turn.\n')
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
  // Reserve one probe so a slow last poll cannot push the run past the hook timeout.
  const remainingMs = startedAt + HOOK_BUDGET_MS - Date.now() - PROBE_TIMEOUT_MS
  if (!free) {
    markPending(markerPath)
    process.stderr.write('nuxt typecheck skipped: another run was still going after 5 minutes; it will run again next turn.\n')
  }
  else if (remainingMs < MIN_TYPECHECK_MS) {
    markPending(markerPath)
    process.stderr.write('nuxt typecheck skipped: too little of the hook budget left; it will run again next turn.\n')
  }
  else {
    const result = runTypecheck(projectDir, remainingMs)
    if (result === null) markPending(markerPath)
    else exitCode = result
  }
}
finally {
  releaseLock(lockPath)
}
process.exit(exitCode)
