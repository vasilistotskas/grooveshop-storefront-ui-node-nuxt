/**
 * Fill the page cache of a freshly deployed build, so no visitor pays for
 * a cold render.
 *
 * Every build caches under its own namespace (`server/plugins/storage.ts`),
 * so a deploy starts from an empty cache and the first visit to each page
 * renders from scratch. Measured after the 2026-09-25 deploys: 22-28 renders
 * over 1 s in the first 15 minutes (p50 ~1.5 s), mostly `_payload.json`
 * for client-side navigation, then steady state.
 *
 * Runs as an Argo CD PostSync hook (`grooveshop-infrastructure`, chart
 * `storefront-warm-helm`), i.e. once every Deployment is Healthy, from the
 * SAME image as the storefront. For every store it:
 *
 * 1. finds the storefront hosts: the Ingress rules that route `/` to the
 *    storefront Service (onboarding a tenant adds one, so nothing here
 *    needs a tenant list);
 * 2. reads the store's sitemap and takes each page's canonical host from
 *    the sitemap itself (so a `www.` twin collapses into its store);
 * 3. requests each page for every device class, because the cache varies
 *    on `host` + `x-device-class`, and then its `_payload.json`, which Nuxt
 *    caches separately and fetches on client-side navigation. A page whose
 *    response carries no `s-maxage` is not cached (`/cart`), so its other
 *    variants are skipped.
 *
 * Requests go straight to the Service with only Host, User-Agent and
 * Accept. Verified 2026-09-25: such a render is byte-identical to one that
 * came through Cloudflare and Traefik (only Cloudflare's `Vary` differs),
 * so what this caches is exactly what a visitor would have.
 *
 * Exit 1 only when the warm-up cannot run at all (no Ingress access, no
 * storefront host, no build id) or when this image's build is not the one
 * being served, which means the hook's image tag drifted from the
 * Deployment's. A page that fails to render is logged and counted; it does
 * not fail the sync.
 *
 * Deliberately `node:http(s)`, not `fetch`: `fetch` drops a `Host` header.
 */
import { readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { pathToFileURL } from 'node:url'

/**
 * One User-Agent per device class, each classified by
 * `shared/utils/deviceClass.ts` into its class (the unit test asserts it).
 * The tablet one is an Android tablet: an iPad's UA contains "Mobile" and
 * is served the mobile render.
 */
/**
 * Sent with every warm-up request so the storefront's logs can tell these
 * renders from visitors' (`server/middleware/2.evlog-client.ts` records it
 * as `client.cacheWarm`). A header rather than a word in the User-Agent:
 * nothing renders or caches differently on it, where a "bot" User-Agent
 * could reach any module that special-cases crawlers and put that render
 * in the cache every visitor shares.
 */
export const CACHE_WARM_HEADER = 'x-grooveshop-cache-warm'

export const DEVICE_USER_AGENTS = {
  desktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 grooveshop-cache-warm',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1 grooveshop-cache-warm',
  tablet: 'Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36 grooveshop-cache-warm',
}

/** Hosts whose `/` is routed to `serviceName`, in Ingress order. */
export function storefrontHosts(ingressList, serviceName) {
  const hosts = []
  for (const ingress of ingressList.items ?? []) {
    for (const rule of ingress.spec?.rules ?? []) {
      if (!rule.host) continue
      const routesRoot = (rule.http?.paths ?? []).some(
        path => path.path === '/' && path.backend?.service?.name === serviceName,
      )
      if (routesRoot && !hosts.includes(rule.host)) hosts.push(rule.host)
    }
  }
  return hosts
}

/** The `<loc>`s of a sitemap, split into nested sitemaps and page URLs. */
export function sitemapLocations(xml) {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(match => decodeXml(match[1]))
  return /<sitemapindex[\s>]/.test(xml) ? { sitemaps: locs, pages: [] } : { sitemaps: [], pages: locs }
}

function decodeXml(value) {
  return value
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', '\'')
    .replaceAll('&amp;', '&')
}

/**
 * The URL a client-side navigation fetches for `pathname`: Nuxt joins the
 * page path and `_payload.json` and adds the build id as `_b`
 * (nuxt `app/composables/payload.ts`). The query is part of the cache key,
 * so it must be exactly this.
 */
export function payloadPath(pathname, buildId) {
  return `${pathname.replace(/\/+$/, '')}/_payload.json?_b=${encodeURIComponent(buildId)}`
}

/** A cached (SWR) route answers with `s-maxage`; an uncached one does not. */
export function isCachedResponse(headers) {
  return /(?:^|[\s,])s-maxage=\d+/.test(String(headers['cache-control'] ?? ''))
}

/** Pages in warm-up order: shallow first (home and listings serve the most), then as listed. */
export function warmOrder(pages) {
  const depth = page => page.pathname.split('/').filter(Boolean).length
  return pages
    .map((page, index) => ({ page, index }))
    .sort((a, b) => depth(a.page) - depth(b.page) || a.index - b.index)
    .map(({ page }) => page)
}

function log(level, message, fields = {}) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level, tag: 'cache-warm', message, ...fields })}\n`)
}

function request(url, { headers = {}, ca, timeoutMs }) {
  const target = new URL(url)
  const client = target.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const started = performance.now()
    const req = client.get(target, { headers, ca, timeout: timeoutMs }, (response) => {
      const chunks = []
      response.on('data', chunk => chunks.push(chunk))
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8'),
        ms: Math.round(performance.now() - started),
      }))
      response.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error(`timed out after ${timeoutMs} ms`)))
    req.on('error', reject)
  })
}

async function listIngresses() {
  const dir = '/var/run/secrets/kubernetes.io/serviceaccount'
  const namespace = readFileSync(`${dir}/namespace`, 'utf8').trim()
  const response = await request(
    `https://kubernetes.default.svc/apis/networking.k8s.io/v1/namespaces/${namespace}/ingresses`,
    {
      headers: { authorization: `Bearer ${readFileSync(`${dir}/token`, 'utf8').trim()}` },
      ca: readFileSync(`${dir}/ca.crt`),
      timeoutMs: 15_000,
    },
  )
  if (response.status !== 200) throw new Error(`listing Ingresses answered ${response.status}`)
  return { namespace, ingresses: JSON.parse(response.body) }
}

async function main() {
  const target = process.env.WARM_TARGET
  const serviceName = process.env.WARM_SERVICE
  const concurrency = Number(process.env.WARM_CONCURRENCY)
  const timeoutMs = Number(process.env.WARM_TIMEOUT_MS)
  if (!target || !serviceName || !(concurrency > 0) || !(timeoutMs > 0)) {
    throw new Error('WARM_TARGET, WARM_SERVICE, WARM_CONCURRENCY and WARM_TIMEOUT_MS are required')
  }
  const get = (path, host, accept, userAgent = DEVICE_USER_AGENTS.desktop) =>
    request(new URL(path, target), { headers: { host, accept, 'user-agent': userAgent, [CACHE_WARM_HEADER]: '1' }, timeoutMs })

  const { namespace, ingresses } = await listIngresses()
  const candidates = storefrontHosts(ingresses, serviceName)
  if (!candidates.length) throw new Error(`no Ingress in ${namespace} routes / to ${serviceName}`)

  const ownBuild = JSON.parse(readFileSync(new URL('../public/_nuxt/builds/latest.json', import.meta.url), 'utf8')).id
  const served = await get('/_nuxt/builds/latest.json', candidates[0], 'application/json')
  const servedBuild = served.status === 200 ? JSON.parse(served.body).id : undefined
  if (servedBuild !== ownBuild) {
    throw new Error(`this image is build ${ownBuild} but ${serviceName} serves ${servedBuild ?? `HTTP ${served.status}`}: the hook's image tag is not the Deployment's`)
  }

  // Canonical pages per store, from each candidate host's own sitemap. A
  // host that redirects (a `www.` twin to its store) has no pages of its
  // own; its store's sitemap is read under the store's host.
  const pages = new Map()
  const redirectingHosts = []
  for (const host of candidates) {
    const queue = ['/sitemap.xml']
    while (queue.length) {
      const path = queue.shift()
      const response = await get(path, host, 'application/xml')
      if (response.status >= 300 && response.status < 400) {
        redirectingHosts.push(host)
        continue
      }
      if (response.status !== 200) {
        log('warn', 'sitemap not served', { host, path, status: response.status })
        continue
      }
      const { sitemaps, pages: locs } = sitemapLocations(response.body)
      for (const loc of sitemaps) queue.push(new URL(loc).pathname)
      for (const loc of locs) {
        const url = new URL(loc)
        pages.set(`${url.host}${url.pathname}`, { host: url.host, pathname: url.pathname })
      }
    }
  }

  const started = performance.now()
  const summary = { pages: pages.size, rendered: 0, payloads: 0, uncached: 0, failed: 0 }
  const queue = warmOrder([...pages.values()])
  async function worker() {
    for (let page = queue.shift(); page; page = queue.shift()) {
      for (const [deviceClass, userAgent] of Object.entries(DEVICE_USER_AGENTS)) {
        try {
          const html = await get(page.pathname, page.host, 'text/html', userAgent)
          if (html.status !== 200) {
            summary.failed++
            log('warn', 'page did not render', { host: page.host, path: page.pathname, deviceClass, status: html.status })
            break
          }
          summary.rendered++
          if (!isCachedResponse(html.headers)) {
            summary.uncached++
            break
          }
          const payload = await get(payloadPath(page.pathname, ownBuild), page.host, 'application/json', userAgent)
          if (payload.status === 200) summary.payloads++
          else {
            summary.failed++
            log('warn', 'payload did not render', { host: page.host, path: page.pathname, deviceClass, status: payload.status })
          }
        }
        catch (error) {
          summary.failed++
          log('warn', 'request failed', { host: page.host, path: page.pathname, deviceClass, error: String(error?.message ?? error) })
        }
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))

  log('info', 'cache warmed', {
    namespace,
    build: ownBuild,
    hosts: [...new Set([...pages.values()].map(page => page.host))],
    redirectingHosts,
    ...summary,
    seconds: Math.round((performance.now() - started) / 1000),
  })
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    log('error', 'cache warm-up could not run', { error: String(error?.message ?? error) })
    process.exit(1)
  })
}
