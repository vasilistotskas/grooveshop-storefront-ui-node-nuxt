/* eslint-disable no-console */
// Audit i18n keys used via `t(...)` across the app against BOTH the global
// JSON locale files AND every component-scoped <i18n lang="yaml"> block, so
// keys that only exist inside a component block still count as defined.
// Report only keys that are genuinely missing from everywhere.
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const localeFiles = [
  'i18n/locales/el-GR.json',
  'i18n/locales/auth/el-GR.json',
  'i18n/locales/breadcrumb/el-GR.json',
  'i18n/locales/checkout/el-GR.json',
  'i18n/locales/cookies/el-GR.json',
  'i18n/locales/validation/el-GR.json',
]
const definedKeys = new Set()
const flatten = (obj, prefix = '') => {
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? prefix + '.' + k : k
    definedKeys.add(key)
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key)
  }
}
for (const f of localeFiles) {
  if (fs.existsSync(f)) flatten(JSON.parse(fs.readFileSync(f, 'utf8')))
}

// Minimal YAML-ish parser: indentation-based, `key: value`. Good enough for
// the style used in these component blocks (no anchors, no flow collections,
// no multi-line scalars).
function indexYamlKeys(body) {
  const lines = body.split(/\r?\n/)
  const stack = [] // array of {indent, prefix}
  for (const raw of lines) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const indent = raw.length - raw.trimStart().length
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop()
    const line = raw.trim()
    const m = line.match(/^([\w.-]+)\s*:\s*(.*)$/)
    if (!m) continue
    const [, key, val] = m
    const prefix = stack.length ? stack[stack.length - 1].prefix + '.' + key : key
    if (!val) {
      // object opener
      stack.push({ indent, prefix })
    }
    // If val is numeric/boolean/null with no quoting, vue-i18n drops it —
    // caller can flag separately via i18n-block-audit.mjs.
    definedKeys.add(prefix)
  }
}

const vueFiles = execSync('find app -type f -name "*.vue"', { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)
for (const f of vueFiles) {
  const src = fs.readFileSync(f, 'utf8')
  const m = src.match(/<i18n[^>]*lang="yaml"[^>]*>([\s\S]*?)<\/i18n>/)
  if (!m) continue
  // Skip the `el:` top-level language key so keys are rooted at their real names.
  const body = m[1].replace(/^\s*el\s*:\s*$/m, '')
  indexYamlKeys(body)
}

const files = execSync('find app shared server -type f \\( -name "*.vue" -o -name "*.ts" \\)', { encoding: 'utf8' })
  .trim()
  .split(/\r?\n/)

const rx = /\b(?:\$t|t|i18n\.t)\(\s*(['"`])([a-zA-Z_][\w.-]*?)\1\s*[,)]/g
const usedKeys = new Map()
for (const f of files) {
  if (!fs.existsSync(f)) continue
  const src = fs.readFileSync(f, 'utf8')
  const cleaned = src.replace(/<i18n[\s\S]*?<\/i18n>/g, '')
  let m
  while ((m = rx.exec(cleaned)) !== null) {
    const k = m[2]
    if (!usedKeys.has(k)) usedKeys.set(k, [])
    const line = cleaned.substring(0, m.index).split('\n').length
    usedKeys.get(k).push(f + ':' + line)
  }
}

const missing = []
for (const [k, locs] of usedKeys.entries()) {
  if (!definedKeys.has(k)) missing.push({ key: k, locs })
}
missing.sort((a, b) => a.key.localeCompare(b.key))
console.log(`Used: ${usedKeys.size} | Defined (globals + blocks): ${definedKeys.size} | TRULY MISSING: ${missing.length}`)
console.log('')
for (const m of missing) console.log(`${m.key} | ${m.locs[0]}`)
