/**
 * PostToolUse hook: Mark the edited checkout as needing a typecheck.
 *
 * Records the checkout under this session whenever a .ts/.vue/.mts/.cts/.tsx file
 * is edited. The Stop hook (typecheck.mjs) reads the marker to decide whether to
 * run `nuxt typecheck`, avoiding a long typecheck on every turn.
 *
 * Receives JSON on stdin: { session_id, tool_name, tool_input: { file_path, ... } }
 */
import { readFileSync } from 'node:fs'
import { checkoutOf, markPending } from './lib/checkout.mjs'

const input = JSON.parse(readFileSync(0, 'utf8'))
const filePath = input.tool_input?.file_path

if (filePath && /\.(ts|vue|mts|cts|tsx)$/.test(filePath)) {
  const checkout = checkoutOf(filePath)
  if (checkout) markPending(input.session_id, checkout)
}
