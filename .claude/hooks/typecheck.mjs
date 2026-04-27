/**
 * Stop hook: Run vue-tsc when TS/Vue files were edited this session.
 *
 * - Reads the `.claude/.typecheck-pending` marker (written by track-typecheck.mjs).
 * - If absent: exit 0 silently (no edits, no need to typecheck).
 * - If `stop_hook_active` is true: exit 0 to avoid Stop-hook loops.
 * - Otherwise: run `npx vue-tsc --noEmit`. On failure, exit 2 with the
 *   compiler output piped to stderr so Claude is forced to address the errors.
 *
 * Hard timeout 180s — vue-tsc on this codebase typically completes in ~30s.
 *
 * Receives JSON on stdin: { stop_hook_active, transcript_path, ... }
 */
import { readFileSync, existsSync, unlinkSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))

if (input.stop_hook_active) {
  process.exit(0)
}

const markerPath = resolve('.claude', '.typecheck-pending')
if (!existsSync(markerPath)) {
  process.exit(0)
}

try {
  unlinkSync(markerPath)
}
catch {
  // If we can't remove the marker the next turn will run again — harmless.
}

try {
  execSync('npx vue-tsc --noEmit', {
    stdio: 'pipe',
    timeout: 180_000,
    encoding: 'utf8',
  })
  process.exit(0)
}
catch (err) {
  const stdout = err.stdout?.toString() || ''
  const stderr = err.stderr?.toString() || ''
  const output = stdout || stderr || err.message || 'vue-tsc failed with no output.'
  process.stderr.write('Type check failed. Fix the TypeScript errors below before stopping:\n\n')
  process.stderr.write(output)
  process.exit(2)
}
