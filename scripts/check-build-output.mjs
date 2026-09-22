/**
 * check-build-output.mjs
 *
 * Fails a production build whose client assets can serve the wrong CSS.
 *
 * Usage (after `pnpm run build`):
 *   node scripts/check-build-output.mjs
 *
 * Runs in CI after the build AND inside `docker/Dockerfile`, because the
 * two build from different contexts: CI builds a git checkout, the image
 * builds a `.dockerignore`-filtered copy — and the first failure below
 * only ever happened in the second.
 *
 * WHAT IT GUARDS
 * --------------
 * 1. Exactly one entry stylesheet, and the one the SSR HTML links.
 *    Under `experimental.viteEnvironmentApi` the client and SSR
 *    environments each compile `main.css`, and Tailwind's automatic
 *    source detection decides what each scans by `.gitignore`. The image
 *    build ran without it, so the two scanned different generated files
 *    and emitted two different `entry.*.css`: the SSR HTML linked one,
 *    the client chunks pulled in the other, and the later file's base
 *    utilities overrode the first's `lg:` ones (v3.205.1 — the homepage
 *    hero kept its phone layout on desktop). tailwindlabs/tailwindcss#19888.
 *
 * 2. Every client JS file carries the build tag (`CLIENT_BUILD_TAG` in
 *    nuxt.config.ts). Without it a chunk can keep its file name while its
 *    `__vite__mapDeps` preload list changes, and Cloudflare's immutable
 *    cache serves the previous build's bytes under the new build's name
 *    (v3.205.2). nuxt/nuxt#36136.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const OUTPUT = '.output'
const CLIENT_DIR = join(OUTPUT, 'public', '_nuxt')
const SERVER_DIR = join(OUTPUT, 'server')

const ENTRY_CSS = /^entry\.[\w-]+\.css$/
const TAGGED_JS = /^[\w-]+-([0-9a-f]{8})\.js$/

const failures = []

function filesUnder(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...filesUnder(path))
    else out.push(path)
  }
  return out
}

const clientFiles = readdirSync(CLIENT_DIR).filter(name => statSync(join(CLIENT_DIR, name)).isFile())

// 1. One entry stylesheet, referenced by the server bundle.
const entryStylesheets = clientFiles.filter(name => ENTRY_CSS.test(name))
if (entryStylesheets.length !== 1) {
  failures.push(
    `expected exactly one entry stylesheet in ${CLIENT_DIR}, found ${entryStylesheets.length}: `
    + `${entryStylesheets.join(', ') || '(none)'} — the client and SSR environments compiled `
    + 'different CSS (is `.gitignore` in the build context?)',
  )
}
else {
  const [entryCss] = entryStylesheets
  const serverReferences = filesUnder(SERVER_DIR)
    .filter(path => /\.(?:m?js|json)$/.test(path))
    .some(path => readFileSync(path, 'utf8').includes(entryCss))
  if (!serverReferences) {
    failures.push(
      `the server bundle never references ${entryCss}: the SSR HTML links a stylesheet `
      + 'the client build did not emit',
    )
  }
}

// 2. One build tag on every client JS file.
const jsFiles = clientFiles.filter(name => name.endsWith('.js'))
const tags = new Set()
const untagged = []
for (const name of jsFiles) {
  const match = TAGGED_JS.exec(name)
  if (match) tags.add(match[1])
  else untagged.push(name)
}
if (!jsFiles.length) {
  failures.push(`no client JS files in ${CLIENT_DIR}`)
}
if (untagged.length) {
  failures.push(
    `${untagged.length} client JS file(s) carry no build tag (e.g. ${untagged.slice(0, 3).join(', ')}) — `
    + 'see CLIENT_BUILD_TAG in nuxt.config.ts',
  )
}
if (tags.size > 1) {
  failures.push(`client JS files carry ${tags.size} different build tags: ${[...tags].join(', ')}`)
}

if (failures.length) {
  for (const failure of failures) process.stderr.write(`check-build-output: ${failure}\n`)
  process.exit(1)
}

process.stdout.write(
  `check-build-output: ok — ${entryStylesheets[0]}, ${jsFiles.length} JS files tagged ${[...tags][0]}\n`,
)
