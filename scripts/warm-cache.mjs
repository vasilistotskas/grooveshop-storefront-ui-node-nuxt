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
 *    variants are skipped.
 *
 * Requests go straight to the Service with only Host, User-Agent and
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

function request(url, { method = 'GET', headers = {}, body, ca, timeoutMs }) {
  const target = new URL(url)
  const client = target.protocol === 'https:' ? https : http
  return new Promise((resolve, reject) => {
    const started = performance.now()
    const req = client.request(target, { method, headers, ca, timeout: timeoutMs }, (response) => {
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
    req.end(body)
  })
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
  await recordWarmedBuild(kube, stateConfigMap, ownBuild)

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
