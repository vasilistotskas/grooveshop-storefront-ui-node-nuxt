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
import { readFileSync, existsSync, unlinkSync } from 'node:fs'
import { execFileSync, execSync } from 'node:child_process'
import { resolve } from 'node:path'

// Two `nuxt typecheck` runs regenerate `.nuxt/` at the same time, and the one
// that reads it half written sees an empty typed-route map: dozens of
// `RouteLocationI18nInput<never>` errors that are not in the code. Other
// Claude sessions run the same command in this checkout, so wait for them.
const TYPECHECK_PATTERN = String.raw`nuxt(\.mjs)?[\s"]+typecheck`

function nuxtTypecheckRunning() {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('powershell', [
        '-NoProfile', '-NonInteractive', '-Command',
        `(Get-CimInstance Win32_Process | Where-Object { $_.Name -match '^node' -and $_.CommandLine -match '${TYPECHECK_PATTERN}' -and $_.ProcessId -ne ${process.pid} } | Measure-Object).Count`,
      ], { encoding: 'utf8', stdio: 'pipe', timeout: 20_000 })
      return Number(out.trim()) > 0
    }
    execFileSync('pgrep', ['-f', String.raw`^node\s.*` + TYPECHECK_PATTERN], { stdio: 'pipe' })
    return true
  }
  catch {
    // pgrep exits 1 on no match; a failed probe must not block the turn.
    return false
  }
}

function waitForOtherTypecheck(timeoutMs = 300_000, pollMs = 3_000) {
  const deadline = Date.now() + timeoutMs
  while (nuxtTypecheckRunning()) {
    if (Date.now() >= deadline) return false
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, pollMs)
  }
  return true
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

if (!waitForOtherTypecheck()) {
  process.stderr.write('nuxt typecheck skipped: another run was still going after 5 minutes; run `pnpm typecheck` manually.\n')
  process.exit(0)
}

try {
  execSync('pnpm run typecheck', {
    cwd: projectDir,
    stdio: 'pipe',
    timeout: 600_000,
    encoding: 'utf8',
    // 8 GB heap, like CI: the default limit aborts with exit 134 (OOM), not a type error.
    env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' },
  })
  process.exit(0)
}
catch (err) {
  if (err.code === 'ETIMEDOUT' || err.signal === 'SIGTERM') {
    process.stderr.write('nuxt typecheck timed out after 10 minutes; run `pnpm typecheck` manually.\n')
    process.exit(0)
  }
  const output = `${err.stdout?.toString() || ''}${err.stderr?.toString() || ''}`.trim()
  if (/not recognized as an internal or external command|command not found/i.test(output)) {
    process.stderr.write('pnpm not found; skipping typecheck.\n')
    process.exit(0)
  }
  process.stderr.write('Type check failed. Fix the TypeScript errors below before stopping:\n\n')
  process.stderr.write(output || err.message || 'nuxt typecheck failed with no output.')
  process.exit(2)
}
