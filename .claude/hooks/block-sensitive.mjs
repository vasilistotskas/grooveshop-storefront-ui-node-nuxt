/**
 * PreToolUse hook: Block edits to sensitive files.
 *
 * Blocks: .env, .env.*, pnpm-lock.yaml, types.gen.ts, zod.gen.ts
 * Allows: .env.example (template file meant to be edited)
 *
 * Receives JSON on stdin: { tool_name, tool_input: { file_path, ... } }
 * Exit 0 = allow, Exit 2 = block (stderr shown as reason)
 */
import { readFileSync } from 'node:fs'

const input = JSON.parse(readFileSync(0, 'utf8'))
const filePath = input.tool_input?.file_path || ''

// Normalize to forward slashes for consistent matching
const normalized = filePath.replace(/\\/g, '/')

// Check blocked patterns
const isEnvFile = /(^|\/)\.env($|\.)/.test(normalized)
const isEnvExample = /(^|\/)\.env\.example$/.test(normalized)
const isLockFile = /(^|\/)pnpm-lock\.yaml$/.test(normalized)
const isGeneratedTypes = /(^|\/)types\.gen\.ts$/.test(normalized)
const isGeneratedZod = /(^|\/)zod\.gen\.ts$/.test(normalized)

const isBlocked = (isEnvFile && isEnvExample === false) || isLockFile || isGeneratedTypes || isGeneratedZod

if (isBlocked) {
  const reason = isLockFile
    ? 'Use pnpm to manage dependencies instead.'
    : (isGeneratedTypes || isGeneratedZod)
        ? 'Use pnpm openapi-ts to regenerate.'
        : 'Edit .env.example instead.'
  process.stderr.write(`BLOCKED: ${filePath} should not be edited manually. ${reason}`)
  process.exit(2)
}
