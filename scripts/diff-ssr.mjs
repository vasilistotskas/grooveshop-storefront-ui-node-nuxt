/**
 * Diff two `scripts/capture-ssr.mjs` capture directories after
 * normalising what legitimately differs between two builds.
 *
 * Two builds of the SAME source never produce identical HTML: asset
 * hashes, CSP nonces, Vue's generated ids, scoped-style hashes and the
 * serialised payload all move. The normaliser below strips exactly those
 * so that whatever remains in the diff is a real change to what a
 * visitor receives.
 *
 * Usage:
 *   node scripts/diff-ssr.mjs <before-dir> <after-dir> [--mask mask.json] [--verbose]
 *   node scripts/diff-ssr.mjs <a> <b> --learn mask.json
 *
 * `--learn` compares two captures of the SAME build taken minutes apart
 * and writes the lines that differed anyway (SWR content such as a like
 * count or a "trending" list) into a mask file; `--mask` then ignores
 * those lines, so a later before/after diff flags only real changes.
 *
 * Exit code 1 when any capture differs beyond the mask, 0 otherwise.
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const [beforeDir, afterDir, ...rest] = process.argv.slice(2)
if (!beforeDir || !afterDir) {
  console.error('usage: node scripts/diff-ssr.mjs <before-dir> <after-dir> [--mask file] [--learn file] [--verbose]')
  process.exit(2)
}
const flags = parseArgs(rest)
const verbose = Boolean(flags.verbose)
const mask = flags.mask ? new Set(JSON.parse(readFileSync(flags.mask, 'utf8'))) : new Set()

const slugs = readdirSync(beforeDir)
  .filter(name => name.endsWith('.html'))
  .map(name => name.slice(0, -'.html'.length))
  .sort()

let failures = 0
const learned = new Set()

for (const slug of slugs) {
  const beforeHtml = join(beforeDir, `${slug}.html`)
  const afterHtml = join(afterDir, `${slug}.html`)
  if (!existsSync(afterHtml)) {
    console.log(`MISSING  ${slug} (not in ${afterDir})`)
    failures++
    continue
  }
  const before = normaliseCapture(readFileSync(beforeHtml, 'utf8'), readMeta(beforeDir, slug))
  const after = normaliseCapture(readFileSync(afterHtml, 'utf8'), readMeta(afterDir, slug))

  const changed = []
  for (const part of ['status', 'headers', 'body', 'payload']) {
    const diff = lineDiff(before[part], after[part])
    const real = diff.filter(line => !mask.has(line.slice(1).trim()))
    if (flags.learn) diff.forEach(line => learned.add(line.slice(1).trim()))
    if (real.length) changed.push([part, real])
  }

  if (!changed.length) {
    console.log(`same     ${slug}`)
    continue
  }
  failures++
  console.log(`DIFF     ${slug}  (${changed.map(([part, lines]) => `${part}:${lines.length}`).join(', ')})`)
  if (verbose) {
    for (const [part, lines] of changed) {
      console.log(`  --- ${part}`)
      for (const line of lines.slice(0, 40)) console.log(`  ${line}`)
      if (lines.length > 40) console.log(`  … ${lines.length - 40} more`)
    }
  }
}

if (flags.learn) {
  writeFileSync(flags.learn, `${JSON.stringify([...learned].sort(), null, 2)}\n`)
  console.log(`\nmask with ${learned.size} line(s) written to ${flags.learn}`)
  process.exit(0)
}

console.log(`\n${slugs.length - failures}/${slugs.length} captures identical after normalisation`)
process.exit(failures ? 1 : 0)

function readMeta(dir, slug) {
  const path = join(dir, `${slug}.json`)
  return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {}
}

/**
 * Split a capture into the four things worth comparing separately —
 * status, kept headers, the payload script and the body — and normalise
 * each. Order matters: hashes are rewritten before tags are removed so
 * a preload for a hashed chunk never survives as a stray difference.
 */
function normaliseCapture(html, meta) {
  const payloadMatch = html.match(/<script type="application\/json"[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  const payload = payloadMatch ? normalisePayload(payloadMatch[1]) : ''

  let body = html
  // 0. Cloudflare's edge rewrites: email obfuscation re-encodes every
  //    address per response and injects its decoder script. Neither is
  //    ours.
  body = body.replace(/email-protection#[0-9a-f]+/g, 'email-protection#X')
  body = body.replace(/data-cfemail="[0-9a-f]+"/g, 'data-cfemail="X"')
  body = body.replace(/<script[^>]*src="\/cdn-cgi\/[^"]*"[^>]*><\/script>\s*/g, '')
  body = body.replace(/<script[^>]*>\(function\(\)\{function c\(\)[\s\S]*?__CF\$cv\$params[\s\S]*?<\/script>\s*/g, '')
  // @nuxtjs/i18n serialises the messages the render USED, in the order
  // the components asked for them — a stable set with an unstable
  // order. The translated text is compared where it is painted.
  body = body.replace(/<script type="application\/json"[^>]*data-nuxt-i18n="[^"]*"[^>]*>[\s\S]*?<\/script>/g, '<script data-nuxt-i18n></script>')
  // 1. CSP nonces (fresh per request) and the build-hashed asset names.
  body = body.replace(/\s+nonce="[^"]*"/g, '')
  body = body.replace(/\/_nuxt\/[A-Za-z0-9_.-]+\.(js|css|mjs)/g, '/_nuxt/HASH.$1')
  body = body.replace(/\/_nuxt\/builds\/meta\/[a-f0-9-]+\.json/g, '/_nuxt/builds/meta/HASH.json')
  // 2. Module graph tags: which chunks are preloaded is a build concern,
  //    not a rendering one. The rendered markup they load is what is
  //    compared.
  body = body.replace(/<link[^>]+rel="(?:modulepreload|preload|prefetch|stylesheet)"[^>]*>\s*/g, '')
  body = body.replace(/<script type="module"[^>]*src="[^"]*"[^>]*><\/script>\s*/g, '')
  // 3. The payload and config scripts are diffed separately.
  body = body.replace(/<script type="application\/json"[^>]*id="__NUXT_DATA__"[^>]*>[\s\S]*?<\/script>/g, '<script id="__NUXT_DATA__"></script>')
  body = body.replace(/<script>window\.__NUXT__[\s\S]*?<\/script>/g, '<script>window.__NUXT__</script>')
  // 4. Scoped-style hashes are derived from the component FILE PATH, so a
  //    moved component changes them without changing what is painted.
  body = body.replace(/data-v-[0-9a-f]{6,10}/g, 'data-v-X')
  // 5. Generated ids (Vue useId / reka-ui) and the attributes that
  //    point at them.
  body = body.replace(/\b(id|for|aria-controls|aria-labelledby|aria-describedby|aria-owns)="((?:v-|reka-)[^"]*)"/g, '$1="ID"')
  // 6. Compare the document body only; the head is covered by the
  //    surviving meta/title tags below.
  const headTitle = (body.match(/<title>[\s\S]*?<\/title>/) ?? [''])[0]
  const headMeta = [...body.matchAll(/<meta [^>]*>/g)].map(m => m[0]).filter(m => !/property="og:image"|name="theme-color"/.test(m)).sort()
  const bodyOnly = (body.match(/<body[\s\S]*<\/body>/) ?? [body])[0]

  return {
    status: String(meta.status ?? ''),
    headers: JSON.stringify(meta.headers ?? {}, null, 1),
    body: `${headTitle}\n${headMeta.join('\n')}\n${prettify(bodyOnly)}`,
    payload,
  }
}

function normalisePayload(json) {
  return json
    .replace(/"buildId":"[^"]*"/g, '"buildId":"X"')
    .replace(/"version":"\d+\.\d+\.\d+[^"]*"/g, '"version":"X"')
    .replace(/"(?:nonce|csrfToken)":"[^"]*"/g, '"$1":"X"')
    .replace(/,/g, ',\n')
}

/** One tag per line so a diff points at an element, not a 200 KB line. */
function prettify(html) {
  return html.replace(/></g, '>\n<').replace(/\r\n/g, '\n')
}

/** Lines present in only one side, prefixed with `-` (before) / `+` (after). */
function lineDiff(a, b) {
  const aLines = a.split('\n')
  const bLines = b.split('\n')
  const aCount = count(aLines)
  const bCount = count(bLines)
  const out = []
  for (const [line, n] of aCount) {
    const m = bCount.get(line) ?? 0
    for (let i = 0; i < n - m; i++) out.push(`-${line}`)
  }
  for (const [line, n] of bCount) {
    const m = aCount.get(line) ?? 0
    for (let i = 0; i < n - m; i++) out.push(`+${line}`)
  }
  return out
}

function count(lines) {
  const map = new Map()
  for (const line of lines) map.set(line, (map.get(line) ?? 0) + 1)
  return map
}

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (!arg.startsWith('--')) continue
    const key = arg.slice(2)
    const next = argv[i + 1]
    if (next === undefined || next.startsWith('--')) {
      out[key] = true
    }
    else {
      out[key] = next
      i++
    }
  }
  return out
}
