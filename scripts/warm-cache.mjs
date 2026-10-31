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
 * 3. adds each page's twin in every other locale the store serves. The
 *    sitemap lists the products and posts in the default locale only, so
 *    `/en/products/…` stayed cold for good: a 1.5 s render at the origin,
 *    measured on demo.grooveshop.space 2026-10-21, long after a deploy;
 * 4. requests each page for every device class, because the cache varies
 *    on `host` + `x-device-class`, and then its `_payload.json`, which Nuxt
 *    caches separately and fetches on client-side navigation. A page whose
 *    response carries no `s-maxage` is not cached (`/cart`), so its other
 *    variants are skipped. Only a page whose payload Nuxt extracts has one
 *    (`hasExtractedPayload`): a custom page (`/kelari`) is cached without
 *    a route rule, its payload stays inline, and asking for its
 *    `_payload.json` rendered a 404 on every deploy.
 *
 * Before the pages, it fills the Cloudflare edge with the build's own files
 * (`warmEdgeAssets`): the first visitor after a deploy otherwise finds none
 * of the new build's chunks at the edge, and one page load asks the origin
 * for ~113 of them at once. The list is the build output shipped in the
 * image (`public/_nuxt`), each file requested once per store through its
 * PUBLIC host, because the edge caches per host and only a request that
 * passes through it fills it. Cloudflare's Tiered Cache means one such
 * request also fills the upper tier the other data centres read from; a
 * request from this Job does not reach every data centre's own cache.
 * Failures are logged and counted, never a reason to fail or repeat the sync.
 *
 * The page requests go straight to the Service with only Host, User-Agent and
 * Accept. Verified 2026-09-25: such a render is byte-identical to one that
 * came through Cloudflare and Traefik (only Cloudflare's `Vary` differs),
 * so what this caches is exactly what a visitor would have.
 *
 * Once per build. The hook runs on EVERY sync, and a sync that leaves the
 * storefront as it was (a Django or gateway release) finds this build's
 * cache already filled: a second pass only forces the revalidation of every
 * stale page at once, against a backend that has just restarted. On
 * 2026-10-20 such a pass after Django v3.143.8 put demo's visitors behind
 * 3-10 s renders. The build last warmed is recorded in a ConfigMap
 * (`WARM_STATE_CONFIGMAP`), after a run completes, so a run that died
 * midway is repeated by the next sync.
 *
 * A run that completed is recorded only when it warmed every store
 * (`warmedEveryStore`): every sitemap it asked for was served, and each
 * store whose sitemap listed pages rendered at least one of them. A
 * sitemap that failed (a 503 while Django restarts after the deploy)
 * leaves that store unknown, and a store with nothing rendered is as cold
 * as before, so either leaves the build unrecorded and the next sync warms
 * it again. A page that fails among others that render is not a reason: a
 * sitemap can list a few URLs that no longer render, and a rule that
 * demanded all of them would re-warm on every sync.
 *
 * Exit 1 only when the warm-up cannot run at all (no Ingress access, no
 * storefront host, no build id) or when this image's build is not the one
 * being served, which means the hook's image tag drifted from the
 * Deployment's. A page that fails to render is logged and counted; it does
 * not fail the sync.
 *
 * Deliberately `node:http(s)`, not `fetch`: `fetch` drops a `Host` header.
 */
import { readdirSync, readFileSync } from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import { relative } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
// The route lists `nuxt.config.ts` builds its page-cache rules from. Node
// runs the TypeScript as is (type stripping); the image ships this module
// and the files it imports beside the script (`docker/Dockerfile`).
import { hasExtractedPayload } from '../shared/constants/prerender.ts'

/**
 * One User-Agent per device class, each classified by
 * `shared/utils/deviceClass.ts` (Cloudflare's rules) into its class; the
 * unit test asserts it.
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

/** The key of `WARM_STATE_CONFIGMAP` that holds the build last warmed. */
const WARMED_BUILD_KEY = 'warmedBuild'

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

/**
 * The path prefixes of the locales a store serves besides its default
 * (`/en`): the alternates its sitemap lists for the home page. A store
 * that serves one locale lists none (webside), and the sitemap module
 * lists no alternate a store does not serve.
 */
export function localePrefixes(xml) {
  for (const [, entry] of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = entry.match(/<loc>\s*([^<\s]+)\s*<\/loc>/)?.[1]
    if (!loc || new URL(decodeXml(loc)).pathname !== '/') continue
    const alternates = [...entry.matchAll(/<xhtml:link\b[^>]*\shref="([^"]+)"/g)]
      .map(match => new URL(decodeXml(match[1])).pathname)
      .filter(pathname => pathname !== '/')
    return [...new Set(alternates)]
  }
  return []
}

/** The locale prefix `pathname` starts with, or `''` for the default locale. */
export function localeOf(pathname, prefixes) {
  return prefixes.find(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`)) ?? ''
}

/** A default-locale page's twin under the locale prefix `prefix`. */
export function localeTwin(pathname, prefix) {
  return pathname === '/' ? prefix : `${prefix}${pathname}`
}

/**
 * The URL paths of a build's files that visitors fetch: every file under
 * `_nuxt` except the precompressed twins Nitro picks by `Accept-Encoding`
 * (`.br`, `.gz`) and `builds/`, whose
 * `latest.json` and per-build metadata are short-lived and not content-hashed.
 * `files` are paths relative to `public/_nuxt`.
 */
export function buildAssetPaths(files) {
  return files
    .map(file => file.replaceAll('\\', '/'))
    .filter(file => !/\.(?:br|gz)$/.test(file) && !file.startsWith('builds/'))
    .map(file => `/_nuxt/${file}`)
    .sort()
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

/**
 * A page Nitro served from its page cache carries the edge directive
 * (`server/plugins/edge-cache.ts`); an uncached page does not.
 */
export function isCachedResponse(headers) {
  return Boolean(headers['cloudflare-cdn-cache-control'])
}

/**
 * Whether a completed run warmed every store, and so may be recorded as
 * this build's warm-up (the rule is in the header): no sitemap failed, at
 * least one store listed pages, and each such store rendered one or more.
 *
 * `failedSitemaps`: the sitemap URLs that were not served; `stores`: the
 * hosts the sitemaps listed pages for; `rendered`: pages rendered, by host.
 */
export function warmedEveryStore({ failedSitemaps, stores, rendered }) {
  return failedSitemaps.length === 0
    && stores.length > 0
    && stores.every(store => (rendered.get(store) ?? 0) > 0)
}

/**
 * Pages in warm-up order: shallow first (home and listings serve the most),
 * then as listed. A locale prefix adds no depth: `/en/products` is as much
 * a listing as `/products`.
 */
export function warmOrder(pages) {
  const depth = page => page.pathname.slice(page.locale?.length ?? 0).split('/').filter(Boolean).length
  return pages
    .map((page, index) => ({ page, index }))
    .sort((a, b) => depth(a.page) - depth(b.page) || a.index - b.index)
    .map(({ page }) => page)
}

function log(level, message, fields = {}) {
  process.stdout.write(`${JSON.stringify({ timestamp: new Date().toISOString(), level, tag: 'cache-warm', message, ...fields })}\n`)
}

function request(url, { method = 'GET', headers = {}, body, ca, timeoutMs, discardBody = false }) {
  const target = new URL(url)
  const client = target.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const started = performance.now()
    const req = client.request(target, { method, headers, ca, timeout: timeoutMs }, (response) => {
      const chunks = []
      if (discardBody) response.resume()
      else response.on('data', chunk => chunks.push(chunk))
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
    req.end(body)
  })
}

/**
 * Request every file of the build once per store, through the store's public
 * host, so Cloudflare holds it before a visitor asks. Returns how the edge
 * answered (`cf-cache-status`, `none` when a host is not proxied) and how
 * many requests failed.
 */
async function warmEdgeAssets({ stores, paths, concurrency, timeoutMs }) {
  const summary = { files: paths.length, requests: 0, failed: 0, edge: {} }
  const queue = stores.flatMap(store => paths.map(path => ({ store, path })))
  async function worker() {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        const response = await request(`https://${item.store}${item.path}`, {
          headers: {
            'accept': '*/*',
            // What a browser sends: the edge keeps a copy per encoding, and
            // this is the one visitors ask for.
            'accept-encoding': 'gzip, deflate, br, zstd',
            'user-agent': DEVICE_USER_AGENTS.desktop,
            [CACHE_WARM_HEADER]: '1',
          },
          timeoutMs,
          discardBody: true,
        })
        summary.requests++
        if (response.status !== 200) {
          summary.failed++
          log('warn', 'build asset not served', { host: item.store, path: item.path, status: response.status })
          continue
        }
        const edge = response.headers['cf-cache-status'] ?? 'none'
        summary.edge[edge] = (summary.edge[edge] ?? 0) + 1
      }
      catch (error) {
        summary.failed++
        log('warn', 'build asset request failed', { host: item.store, path: item.path, error: String(error?.message ?? error) })
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return summary
}

/** The Kubernetes API, as this Job's ServiceAccount, in its own namespace. */
function kubernetes() {
  const dir = '/var/run/secrets/kubernetes.io/serviceaccount'
  const namespace = readFileSync(`${dir}/namespace`, 'utf8').trim()
  const authorization = `Bearer ${readFileSync(`${dir}/token`, 'utf8').trim()}`
  const ca = readFileSync(`${dir}/ca.crt`)
  const call = (path, { method = 'GET', contentType, body } = {}) => request(
    `https://kubernetes.default.svc${path.replace('{namespace}', namespace)}`,
    {
      method,
      headers: { authorization, ...(contentType && { 'content-type': contentType }) },
      body: body && JSON.stringify(body),
      ca,
      timeoutMs: 15_000,
    },
  )
  return { namespace, call }
}

async function listIngresses(kube) {
  const response = await kube.call('/apis/networking.k8s.io/v1/namespaces/{namespace}/ingresses')
  if (response.status !== 200) throw new Error(`listing Ingresses answered ${response.status}`)
  return JSON.parse(response.body)
}

/** The build the last complete warm-up filled, or `undefined`. */
export async function warmedBuild(kube, configMap) {
  const response = await kube.call(`/api/v1/namespaces/{namespace}/configmaps/${configMap}`)
  if (response.status === 404) return undefined
  if (response.status !== 200) throw new Error(`reading ConfigMap ${configMap} answered ${response.status}`)
  return JSON.parse(response.body).data?.[WARMED_BUILD_KEY]
}

/** Record `build` as warm, creating the ConfigMap on the first run. */
export async function recordWarmedBuild(kube, configMap, build) {
  const data = { [WARMED_BUILD_KEY]: build }
  const patched = await kube.call(`/api/v1/namespaces/{namespace}/configmaps/${configMap}`, {
    method: 'PATCH',
    contentType: 'application/merge-patch+json',
    body: { data },
  })
  if (patched.status === 200) return
  if (patched.status !== 404) throw new Error(`updating ConfigMap ${configMap} answered ${patched.status}`)
  const created = await kube.call('/api/v1/namespaces/{namespace}/configmaps', {
    method: 'POST',
    contentType: 'application/json',
    body: { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: configMap }, data },
  })
  if (created.status !== 201) throw new Error(`creating ConfigMap ${configMap} answered ${created.status}`)
}

async function main() {
  const target = process.env.WARM_TARGET
  const serviceName = process.env.WARM_SERVICE
  const concurrency = Number(process.env.WARM_CONCURRENCY)
  const timeoutMs = Number(process.env.WARM_TIMEOUT_MS)
  const stateConfigMap = process.env.WARM_STATE_CONFIGMAP
  if (!target || !serviceName || !(concurrency > 0) || !(timeoutMs > 0) || !stateConfigMap) {
    throw new Error('WARM_TARGET, WARM_SERVICE, WARM_CONCURRENCY, WARM_TIMEOUT_MS and WARM_STATE_CONFIGMAP are required')
  }
  const get = (path, host, accept, userAgent = DEVICE_USER_AGENTS.desktop) =>
    request(new URL(path, target), { headers: { host, accept, 'user-agent': userAgent, [CACHE_WARM_HEADER]: '1' }, timeoutMs })

  const kube = kubernetes()
  const { namespace } = kube
  const ingresses = await listIngresses(kube)
  const candidates = storefrontHosts(ingresses, serviceName)
  if (!candidates.length) throw new Error(`no Ingress in ${namespace} routes / to ${serviceName}`)

  const ownBuild = JSON.parse(readFileSync(new URL('../public/_nuxt/builds/latest.json', import.meta.url), 'utf8')).id
  const served = await get('/_nuxt/builds/latest.json', candidates[0], 'application/json')
  const servedBuild = served.status === 200 ? JSON.parse(served.body).id : undefined
  if (servedBuild !== ownBuild) {
    throw new Error(`this image is build ${ownBuild} but ${serviceName} serves ${servedBuild ?? `HTTP ${served.status}`}: the hook's image tag is not the Deployment's`)
  }

  const warmed = await warmedBuild(kube, stateConfigMap)
  if (warmed === ownBuild) {
    log('info', 'build already warm', { namespace, build: ownBuild })
    return
  }

  // Canonical pages per store, from each candidate host's own sitemap. A
  // host that redirects (a `www.` twin to its store) has no pages of its
  // own; its store's sitemap is read under the store's host.
  const pages = new Map()
  const prefixesByHost = new Map()
  const redirectingHosts = []
  const failedSitemaps = []
  for (const host of candidates) {
    const queue = ['/sitemap.xml']
    while (queue.length) {
      const path = queue.shift()
      let response
      try {
        response = await get(path, host, 'application/xml')
      }
      catch (error) {
        failedSitemaps.push(`${host}${path}`)
        log('warn', 'sitemap request failed', { host, path, error: String(error?.message ?? error) })
        continue
      }
      if (response.status >= 300 && response.status < 400) {
        redirectingHosts.push(host)
        continue
      }
      if (response.status !== 200) {
        failedSitemaps.push(`${host}${path}`)
        log('warn', 'sitemap not served', { host, path, status: response.status })
        continue
      }
      const { sitemaps, pages: locs } = sitemapLocations(response.body)
      for (const loc of sitemaps) queue.push(new URL(loc).pathname)
      const prefixes = localePrefixes(response.body)
      for (const loc of locs) {
        const url = new URL(loc)
        pages.set(`${url.host}${url.pathname}`, { host: url.host, pathname: url.pathname })
        if (prefixes.length) prefixesByHost.set(url.host, prefixes)
      }
    }
  }
  for (const page of [...pages.values()]) {
    const prefixes = prefixesByHost.get(page.host) ?? []
    page.locale = localeOf(page.pathname, prefixes)
    if (page.locale) continue
    for (const prefix of prefixes) {
      const pathname = localeTwin(page.pathname, prefix)
      const key = `${page.host}${pathname}`
      if (!pages.has(key)) pages.set(key, { host: page.host, pathname, locale: prefix })
    }
  }

  const stores = [...new Set([...pages.values()].map(page => page.host))]

  // The build's own files first: a missing chunk breaks the page it is
  // wanted by, where a cold render is only slow.
  const assetsDir = new URL('../public/_nuxt/', import.meta.url)
  const assetFiles = readdirSync(assetsDir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(fileURLToPath(assetsDir), `${entry.parentPath}/${entry.name}`))
  const assetsStarted = performance.now()
  const assets = await warmEdgeAssets({ stores, paths: buildAssetPaths(assetFiles), concurrency, timeoutMs })
  log(assets.failed ? 'warn' : 'info', 'build assets requested through the public hosts', {
    build: ownBuild,
    hosts: stores,
    ...assets,
    seconds: Math.round((performance.now() - assetsStarted) / 1000),
  })
  const renderedByStore = new Map()
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
          renderedByStore.set(page.host, (renderedByStore.get(page.host) ?? 0) + 1)
          if (!isCachedResponse(html.headers)) {
            summary.uncached++
            break
          }
          if (!hasExtractedPayload(page.pathname)) continue
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

  const complete = warmedEveryStore({ failedSitemaps, stores, rendered: renderedByStore })
  if (complete) await recordWarmedBuild(kube, stateConfigMap, ownBuild)

  log(complete ? 'info' : 'warn', complete ? 'cache warmed' : 'cache partly warmed, build not recorded', {
    namespace,
    build: ownBuild,
    hosts: stores,
    storesWithoutRenders: stores.filter(store => !renderedByStore.has(store)),
    failedSitemaps,
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
