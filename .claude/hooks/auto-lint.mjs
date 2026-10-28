/**
 * PostToolUse hook: Auto-lint files after Edit/Write.
 *
 * Runs `eslint --fix` on .ts, .vue, .js, .mjs, .cjs files.
 * Silently catches errors (ESLint failures don't block the workflow).
 *
 * Runs the workspace's own `eslint` binary with this process's node: the version
 * this workspace pins, so the rules match CI. Never through `pnpm exec` (pnpm can
 * run a dependency install when `node_modules` is out of sync, and a hook must
 * never install) and never `npx` (it can fetch a different version from the
 * registry). With no `node_modules` the hook does nothing.
 *
 * Receives JSON on stdin: { tool_name, tool_input: { file_path, ... } }
 */
import { existsSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'

const input = JSON.parse(readFileSync(0, 'utf8'))
const filePath = input.tool_input?.file_path

if (filePath && /\.(ts|mts|cts|tsx|vue|js|mjs|cjs)$/.test(filePath)) {
  const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd()
  const eslintBin = resolve(projectDir, 'node_modules', 'eslint', 'bin', 'eslint.js')
  if (existsSync(eslintBin)) {
    try {
      execFileSync(process.execPath, [eslintBin, '--fix', filePath], { cwd: projectDir, stdio: 'pipe', timeout: 120_000 })
    }
    catch {
      // ESLint errors are non-blocking
    }
  }
}
