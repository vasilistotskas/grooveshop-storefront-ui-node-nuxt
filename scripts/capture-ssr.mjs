/**
 * Capture the SSR HTML of a tenant's public routes, for a before/after
 * diff with `scripts/diff-ssr.mjs`.
 *
 * Why this exists: the storefront's default components are being
 * rewritten while one tenant (webside) must keep rendering byte-for-byte
 * what it renders today. Unit snapshots prove a component still renders
 * the same markup; only a real server render proves the WHOLE page does
 * — the layout, the registry lookups, the head, the payload. So: capture
 * every public route once before a change and once after, normalise
 * what legitimately differs between two builds, and diff the rest.
 *
 * Every route is fetched anonymously in each locale and for each device
 * class, because the cached routes vary on `host` + `x-device-class`
 * and a change that only breaks the mobile render would otherwise pass.
 *
 * Basic auth (staging) is read from a FILE into this process and never
 * printed: pass `--auth-file <path>` (user defaults to `staging`, or
 * `--auth-user <user>`). Nothing here echoes the header.
 *
 *   node scripts/capture-ssr.mjs \
 *     --base https://staging.webside.gr --host staging.webside.gr \
 *     --out .ssr-captures/before --auth-file <path>
 *
 * Output: `<out>/<slug>.html` (body) and `<out>/<slug>.json` (status,
 * final URL, selected response headers) per route × locale × device,
 * plus `<out>/manifest.json` listing every capture.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const args = parseArgs(process.argv.slice(2))

const BASE = required('base')
const HOST = args.host ?? new URL(BASE).host
const OUT = args.out ?? '.ssr-captures/capture'
const LOCALES = (args.locales ?? 'el,en').split(',').filter(Boolean)
const DEVICES = (args.devices ?? 'desktop,mobile').split(',').filter(Boolean)
const DELAY_MS = Number(args.delay ?? 250)

/**
 * Every public webside route family. Dynamic ids are the live ones on
 * production/staging today; the point is a stable set of URLs to fetch
 * before and after, not coverage of every row.
 */
const DEFAULT_ROUTES = [
  '/',
  '/products',
  '/products/2/mini-power-bank-5000mah-tsephs-me-o8onh-lcd-black',
  '/products/category/2/Powerbank',
  '/search?query=powerbank',
  '/blog',
  '/blog/categories',
  '/blog/category/1/asfaleia',
  '/blog/author/4',
  '/blog/post/82/ti-einai-ta-mah-kai-ti-rolo-paizoyn-se-ena-powerbank',
  '/loyalty-program',
  '/cart',
  '/checkout',
  '/contact',
  '/feedback',
  '/about',
  '/vision',
  '/what-is-microlearning',
  '/why-microlearning',
  '/privacy-policy',
  '/terms-of-use',
  '/cookies-policy',
  '/return-policy',
  '/info/faq',
  '/account/login',
  '/account/signup',
  '/account/login/code',
  '/account/password/reset',
  '/offers',
  '/gift-cards',
  '/this-route-does-not-exist',
  '/products/999999/unknown-product',
]

const routes = args.routes
  ? readFileSync(args.routes, 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'))
  : DEFAULT_ROUTES

const USER_AGENTS = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
}

const KEPT_HEADERS = ['content-type', 'location', 'x-robots-tag', 'cache-control', 'vary', 'x-nitro-prerender']

const headers = { host: HOST, accept: 'text/html,application/xhtml+xml' }
if (args['auth-file']) {
  const password = readFileSync(args['auth-file'], 'utf8').trim()
  if (!password) {
    console.error('capture-ssr: the auth file is empty')
    process.exit(1)
  }
  const user = args['auth-user'] ?? 'staging'
  headers.authorization = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`
}

mkdirSync(OUT, { recursive: true })

const manifest = []
for (const locale of LOCALES) {
  for (const device of DEVICES) {
    for (const route of routes) {
      const path = localise(route, locale, LOCALES[0])
      const slug = slugify(`${locale}-${device}-${path}`)
      const url = new URL(path, BASE)
      let status
      let finalUrl = url.href
      let body
      let kept
      try {
        const response = await fetch(url, {
          headers: { ...headers, 'user-agent': USER_AGENTS[device] ?? USER_AGENTS.desktop },
          redirect: 'manual',
        })
        status = response.status
        finalUrl = response.url
        body = await response.text()
        kept = Object.fromEntries(
          KEPT_HEADERS.map(name => [name, response.headers.get(name)]).filter(([, v]) => v !== null),
        )
      }
      catch (error) {
        status = -1
        body = ''
        kept = { error: error instanceof Error ? error.message : String(error) }
      }
      writeFileSync(join(OUT, `${slug}.html`), body)
      writeFileSync(join(OUT, `${slug}.json`), `${JSON.stringify({ route: path, locale, device, status, finalUrl, headers: kept }, null, 2)}\n`)
      manifest.push({ slug, route: path, locale, device, status })
      console.log(`${String(status).padStart(3)}  ${device.padEnd(7)}  ${path}`)
      if (DELAY_MS) await new Promise(resolve => setTimeout(resolve, DELAY_MS))
    }
  }
}
writeFileSync(join(OUT, 'manifest.json'), `${JSON.stringify({ base: BASE, host: HOST, capturedAt: new Date().toISOString(), captures: manifest }, null, 2)}\n`)
console.log(`\n${manifest.length} captures written to ${OUT}`)

function localise(route, locale, defaultLocale) {
  if (locale === defaultLocale) return route
  return route === '/' ? `/${locale}` : `/${locale}${route}`
}

function slugify(value) {
  return value.replace(/^[-/]+/, '').replace(/[^a-z0-9]+/gi, '-').replace(/-+$/, '').toLowerCase() || 'root'
}

function required(name) {
  if (!args[name]) {
    console.error(`capture-ssr: --${name} is required`)
    process.exit(1)
  }
  return args[name]
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
