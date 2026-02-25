/**
 * PostToolUse hook: Auto-lint files after Edit/Write.
 *
 * Runs `npx eslint --fix` on .ts, .vue, .js, .mjs, .cjs files.
 * Silently catches errors (ESLint failures don't block the workflow).
 *
 * Receives JSON on stdin: { tool_name, tool_input: { file_path, ... } }
 */
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

const input = JSON.parse(readFileSync(0, 'utf8'))
const filePath = input.tool_input?.file_path

if (filePath && /\.(ts|vue|js|mjs|cjs)$/.test(filePath)) {
  try {
    execSync(`npx eslint --fix ${JSON.stringify(filePath)}`, { stdio: 'pipe' })
  }
  catch {
    // ESLint errors are non-blocking
  }
}
