/* eslint-disable no-console */
// Scan every <i18n lang="yaml"> block in *.vue files and flag values that
// would be parsed as non-string (numeric, boolean, null) by YAML — those
// are silently dropped by vue-i18n and render as raw keys.
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const files = execSync('find app -type f -name "*.vue"', { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)

// YAML scalar patterns that become non-string (need quoting for vue-i18n).
// Numbers (int/float/hex/oct/sci), booleans, null, yes/no/on/off, "~".
const numericRx = /^[-+]?(\d+(\.\d+)?|0x[0-9a-f]+|0o[0-7]+|\d+e[+-]?\d+)$/i
const boolRx = /^(true|false|yes|no|on|off|~|null)$/i

// vue-i18n message-format compiler treats `@` (linked-message marker)
// and `$` (list interpolation) as reserved inside translation strings.
// An unescaped `@` in a literal like `you@example.com` raises compile
// error code 10 — wrap with `{'@'}` or `{'$'}` literal interpolation.
// `|` is NOT flagged: it's the legitimate pluralization delimiter
// (`singular | plural`) used via `t(key, count)`.
const vueI18nReservedRx = /(?<!\{'|\\)[@$](?![:.])/

const results = []
for (const f of files) {
  const src = fs.readFileSync(f, 'utf8')
  const blockMatch = src.match(/<i18n[^>]*lang="yaml"[^>]*>([\s\S]*?)<\/i18n>/)
  if (!blockMatch) continue
  const body = blockMatch[1]
  const bodyStart = src.indexOf(blockMatch[0]) + blockMatch[0].indexOf(body)
  const lines = body.split('\n')
  const startLine = src.substring(0, bodyStart).split('\n').length
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Match `key: value` with a scalar (skip empty, object openers).
    const m = line.match(/^(\s*)([\w.-]+)\s*:\s*(.+?)\s*$/)
    if (!m) continue
    const [, , key, rawVal] = m
    if (!rawVal || rawVal.startsWith('#')) continue
    // Already quoted or multi-line/flow scalar: fine.
    if (rawVal.startsWith('"') || rawVal.startsWith('\'') || rawVal.startsWith('|') || rawVal.startsWith('>') || rawVal.startsWith('[') || rawVal.startsWith('{')) continue
    if (numericRx.test(rawVal) || boolRx.test(rawVal)) {
      results.push({ file: f, line: startLine + i, key, value: rawVal, reason: 'scalar' })
      continue
    }

    // Strip enclosing quotes for the reserved-char check so quoted
    // values like "you@example.com" are still caught.
    const inner = rawVal.replace(/^['"]|['"]$/g, '')
    if (vueI18nReservedRx.test(inner)) {
      // Allow the legitimate linked-message syntax `@:key.path` / `@.lower:key`.
      const hasLinkedSyntax = /@[:.](?:\w|\{)/.test(inner)
      if (!hasLinkedSyntax) {
        results.push({ file: f, line: startLine + i, key, value: rawVal, reason: 'reserved' })
      }
    }
  }
}

console.log(`Found ${results.length} YAML values vue-i18n will reject or drop:`)
for (const r of results) console.log(`${r.file}:${r.line}  [${r.reason}]  ${r.key}: ${r.value}`)
