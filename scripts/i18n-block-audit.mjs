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
const numericRx = /^[-+]?(\d+(\.\d+)?|0x[0-9a-f]+|0o[0-7]+|\d+e[-+]?\d+)$/i
const boolRx = /^(true|false|yes|no|on|off|~|null)$/i

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
    const m = line.match(/^(\s*)([\w.\-]+)\s*:\s*(.+?)\s*$/)
    if (!m) continue
    const [, , key, rawVal] = m
    if (!rawVal || rawVal.startsWith('#')) continue
    // Already quoted or multi-line/flow scalar: fine.
    if (rawVal.startsWith('"') || rawVal.startsWith("'") || rawVal.startsWith('|') || rawVal.startsWith('>') || rawVal.startsWith('[') || rawVal.startsWith('{')) continue
    if (numericRx.test(rawVal) || boolRx.test(rawVal)) {
      results.push({ file: f, line: startLine + i, key, value: rawVal })
    }
  }
}

console.log(`Found ${results.length} numeric/boolean YAML values that will be dropped by vue-i18n:`)
for (const r of results) console.log(`${r.file}:${r.line}  ${r.key}: ${r.value}`)
