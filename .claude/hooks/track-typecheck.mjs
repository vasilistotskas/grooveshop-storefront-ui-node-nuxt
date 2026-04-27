/**
 * PostToolUse hook: Mark TypeScript/Vue files as needing a typecheck.
 *
 * Touches `.claude/.typecheck-pending` whenever a .ts/.vue/.mts/.cts/.tsx file
 * is edited. The Stop hook (typecheck.mjs) reads this marker to decide whether
 * to run vue-tsc, avoiding a 30+ second typecheck on every turn.
 *
 * Receives JSON on stdin: { tool_name, tool_input: { file_path, ... } }
 */
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const filePath = input.tool_input?.file_path

if (filePath && /\.(ts|vue|mts|cts|tsx)$/.test(filePath)) {
  const markerPath = resolve('.claude', '.typecheck-pending')
  try {
    mkdirSync(dirname(markerPath), { recursive: true })
    writeFileSync(markerPath, String(Date.now()))
  }
  catch {
    // Marker write failures shouldn't break the workflow.
  }
}
