/**
 * PostToolUse hook: Auto-lint files after Edit/Write.
 *
 * Runs `pnpm exec eslint --fix` on .ts, .vue, .js, .mjs, .cjs files.
 * Silently catches errors (ESLint failures don't block the workflow).
 *
 * `pnpm exec`, not `npx`: it runs the eslint version this workspace pins.
 * `npx` falls back to fetching a package from the registry when it can't
 * resolve one locally, which can lint with different rules than CI.
 *
 * Receives JSON on stdin: { tool_name, tool_input: { file_path, ... } }
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const input = JSON.parse(readFileSync(0, 'utf8'))
const filePath = input.tool_input?.file_path

if (filePath && /\.(ts|mts|cts|tsx|vue|js|mjs|cjs)$/.test(filePath)) {
  try {
    execSync(`pnpm exec eslint --fix ${JSON.stringify(filePath)}`, { cwd: process.env.CLAUDE_PROJECT_DIR || process.cwd(), stdio: 'pipe', timeout: 120_000 })
  }
  catch {
    // ESLint errors are non-blocking
  }
}
