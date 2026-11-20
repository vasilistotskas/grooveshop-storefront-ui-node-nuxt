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
 * Runs from the SAME image as the storefront, in a Deployment of its own
 * (`grooveshop-infrastructure`, chart `storefront-warm-helm`) that the
 * sync rolls with the storefront. It is not an Argo CD hook: a hook holds
 * the sync operation open until it finishes, and a warm-up that grows with
 * every page a store adds held production deploys for 7-16 minutes. So it
 * starts while the sync is still rolling, and first waits until the
 * Deployments named in `WARM_WAIT_FOR` (the storefront and the backend its
 * renders call) have finished their rollouts and every ready storefront pod
 * serves this image's build (`waitForRollout`). Then, for every store, it:
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
 * request from this pod does not reach every data centre's own cache.
 * Failures are logged and counted, never a reason to fail the warm-up.
 *
 * The page requests go straight to the storefront pods with only Host,
 * User-Agent and Accept. Verified 2026-09-25: such a render is
 * byte-identical to one that came through Cloudflare and Traefik (only
 * Cloudflare's `Vary` differs), so what this caches is exactly what a
 * visitor would have. Every pod writes the one page cache (Redis), so a
 * page rendered on any pod is warm on all of them.
 *
 * Per pod, not through the Service (`forEachOnPods`). Rendering holds a
 * pod's one JavaScript thread, so the warm-up runs `WARM_CONCURRENCY`
 * renders on EACH ready pod, and re-reads the ready pods every
 * `WARM_POLL_SECONDS`: a pod the HPA adds under the load gets its share, a
 * pod that leaves gets no more. Through the Service, Node's keep-alive
 * agent held one connection per worker for the whole run, kube-proxy picks
 * a pod per connection, and in 20 of the 35 production runs from
 * 2026-11-06 to 11-20 both connections sat on ONE pod: 540-986 s, that pod
 * at 1.3 cores and the others idle, against 408-460 s when they landed on
 * two.
 *
 * Once per build. The pod is replaced only when the storefront tag moves,
 * but it restarts when its node drains, and a second pass over a warm cache
 * only forces the revalidation of every stale page at once: on 2026-10-20
 * such a pass after Django v3.143.8 put demo's visitors behind 3-10 s
 * renders. The build last warmed is recorded in a ConfigMap
 * (`WARM_STATE_CONFIGMAP`) after a run completes, and a run starts only for
 * a build not recorded there, so a run that died midway is repeated when
 * the pod next starts.
 *
 * A run that completed is recorded only when it warmed every store
 * (`warmedEveryStore`): every sitemap it asked for was served, and each
 * store whose sitemap listed pages rendered at least one of them. A
 * sitemap that failed (a 503 while Django restarts after the deploy)
 * leaves that store unknown, a store with nothing rendered is as cold as
 * before, and pages no pod was left to render are cold too, so any of them
 * leaves the build unrecorded. Such a try is repeated, sitemaps read again,
 * up to `WARM_ATTEMPTS` tries in all, `WARM_RETRY_SECONDS` apart (the pod
 * runs the script once per start, so nothing else would repeat it); after
 * the last one it logs `error` ("cache partly warmed, build not recorded"),
 * which the infrastructure's error-log alert reports. A page that fails
 * among others that render is not a reason: a sitemap can list a few URLs
 * that no longer render, and a rule that demanded all of them would never
 * record a build.
 *
 * Exit 1, with an `error` line, when the warm-up cannot run at all (no
 * Ingress access, no storefront host, no build id), when the rollouts it
 * waits for do not finish within `WARM_ROLLOUT_TIMEOUT_SECONDS`, when the
 * storefront finished rolling out on a build that is not this image's
 * (the warm-up's image tag drifted from the storefront's), or when the last
 * try still left the build unrecorded. A page that fails to render is
 * logged and counted; it does not fail the run.
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
 * this build's warm-up (the rule is in the header): no sitemap failed, no
 * page was left unrequested (every pod left the ready set), at least one
 * store listed pages, and each such store rendered one or more.
 *
 * `failedSitemaps`: the sitemap URLs that were not served; `unrequested`:
 * pages no pod was left to render; `stores`: the hosts the sitemaps listed
 * pages for; `rendered`: pages rendered, by host.
 */
export function warmedEveryStore({ failedSitemaps, unrequested, stores, rendered }) {
  return failedSitemaps.length === 0
    && unrequested === 0
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

/**
 * Resolve after `ms`. An `unref`ed wait does not keep the process alive on
 * its own.
 */
function sleep(ms, { unref = false } = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms)
    if (unref) timer.unref()
  })
}

/**
 * Connection errors that mean the pod is gone (deleted, or past its
 * preStop), as opposed to a slow or failed render: nothing listens at its
 * address any more.
 */
const POD_GONE_CODES = new Set(['ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'])

/** Thrown by `work` when its pod is gone: the item goes back on the queue. */
export class PodGone extends Error {}

/** Whether `error` says nothing listens at the pod's address any more. */
export function podGone(error) {
  return POD_GONE_CODES.has(error?.code)
}

/**
 * Whether a Deployment has finished rolling out, by the rule of
 * `kubectl rollout status`: the controller has seen its latest spec, every
 * wanted replica runs it and is available, and no replica of an older
 * ReplicaSet is left.
 */
export function rolloutComplete(deployment) {
  const status = deployment.status ?? {}
  const updated = status.updatedReplicas ?? 0
  return (status.observedGeneration ?? 0) >= (deployment.metadata?.generation ?? 0)
    && updated >= (deployment.spec?.replicas ?? 1)
    && (status.replicas ?? 0) === updated
    && (status.availableReplicas ?? 0) >= updated
}

/**
 * The origin (`http://<pod ip>:<port>`) of every storefront pod ready to
 * serve, from the Service's EndpointSlices. A missing `ready` means unknown
 * and counts as ready (Kubernetes' EndpointConditions); a terminating pod is
 * not ready.
 */
export function readyOrigins(sliceList) {
  const origins = []
  for (const slice of sliceList.items ?? []) {
    const endpoints = (slice.endpoints ?? []).filter(endpoint => endpoint.conditions?.ready !== false)
    if (!endpoints.length) continue
    if (slice.ports?.length !== 1) {
      throw new Error(`EndpointSlice ${slice.metadata?.name} lists ${slice.ports?.length ?? 0} ports, not the one the storefront serves on`)
    }
    const port = slice.ports[0].port
    for (const endpoint of endpoints) {
      const address = endpoint.addresses[0]
      const origin = `http://${slice.addressType === 'IPv6' ? `[${address}]` : address}:${port}`
      if (!origins.includes(origin)) origins.push(origin)
    }
  }
  return origins
}

/**
 * Run `work(item, origin)` over `queue` with `concurrency` items in flight on
 * each pod, starting with `origins`. The pods are read again with
 * `listOrigins()` every `refreshMs` while items remain: a new pod gets
 * workers, and a pod no longer listed takes no new item (the one in flight
 * finishes). A failed read keeps the pods it had. When `work` throws
 * `PodGone`, the item goes back to the front of the queue and the pod takes
 * no more until a read lists it again, so a pod that vanished between two
 * reads costs one request, not every item its workers could fail through.
 * When every worker has stopped that way with items left, it waits
 * `refreshMs` and reads the pods again; it ends early only when such a
 * read lists no pod (or fails). Returns the most pods worked on at once.
 *
 * @template T
 * @param {T[]} queue
 * @param {{
 *   origins: string[],
 *   listOrigins: () => Promise<string[]>,
 *   concurrency: number,
 *   refreshMs: number,
 *   work: (item: T, origin: string) => Promise<unknown>,
 *   onRefresh?: (origins: string[]) => void,
 * }} options
 * @returns {Promise<number>}
 */
export async function forEachOnPods(queue, { origins, listOrigins, concurrency, refreshMs, work, onRefresh = () => {} }) {
  let current = new Set(origins)
  let peak = current.size
  const running = new Set()
  // Workers per pod, counting those still finishing an item for a pod that
  // left: a pod that comes back gets only what brings it to `concurrency`.
  const active = new Map()
  async function worker(origin) {
    while (current.has(origin)) {
      const item = queue.shift()
      if (item === undefined) return
      try {
        await work(item, origin)
      }
      catch (error) {
        if (!(error instanceof PodGone)) throw error
        queue.unshift(item)
        current.delete(origin)
      }
    }
  }
  function launch(origin) {
    for (let count = active.get(origin) ?? 0; count < concurrency; count++) {
      active.set(origin, count + 1)
      const done = worker(origin).finally(() => {
        running.delete(done)
        active.set(origin, active.get(origin) - 1)
      })
      running.add(done)
    }
  }
  current.forEach(launch)
  for (;;) {
    if (running.size) {
      const tick = sleep(refreshMs, { unref: true }).then(() => 'tick')
      if (await Promise.race([Promise.all(running), tick]) !== 'tick' || !queue.length) continue
    }
    else {
      if (!queue.length) break
      // Every worker stopped with items left: each lost its pod. Wait a
      // refresh, then work on whatever the next read lists.
      await sleep(refreshMs)
    }
    // With workers running, a failed read keeps their pods; with none, it
    // leaves no pod to work on.
    const listed = await listOrigins().catch(() => (running.size ? [...current] : []))
    current = new Set(listed)
    listed.forEach(launch)
    peak = Math.max(peak, current.size)
    onRefresh([...current])
    if (!running.size) break
  }
  return peak
}

/**
 * Run `tryOnce(attempt)` until it reports `complete`, at most `attempts`
 * times, waiting `retryMs` between tries; `onRetry(run, attempt)` is told of
 * each try that will be repeated. Returns the last try with its number.
 *
 * @template {{ complete: boolean }} R
 * @param {{
 *   attempts: number,
 *   retryMs: number,
 *   tryOnce: (attempt: number) => Promise<R>,
 *   onRetry: (run: R, attempt: number) => void,
 * }} options
 * @returns {Promise<R & { attempt: number }>}
 */
export async function untilComplete({ attempts, retryMs, tryOnce, onRetry }) {
  for (let attempt = 1; ; attempt++) {
    const run = await tryOnce(attempt)
    if (run.complete || attempt >= attempts) return { ...run, attempt }
    onRetry(run, attempt)
    await sleep(retryMs)
  }
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

/** The Deployments `names`, as the API holds them now. */
export async function readDeployments(kube, names) {
  return Promise.all(names.map(async (name) => {
    const response = await kube.call(`/apis/apps/v1/namespaces/{namespace}/deployments/${name}`)
    if (response.status !== 200) throw new Error(`reading Deployment ${name} answered ${response.status}`)
    return JSON.parse(response.body)
  }))
}

/** The ready pods behind `serviceName` (`readyOrigins`). */
export async function listReadyOrigins(kube, serviceName) {
  const selector = encodeURIComponent(`kubernetes.io/service-name=${serviceName}`)
  const response = await kube.call(`/apis/discovery.k8s.io/v1/namespaces/{namespace}/endpointslices?labelSelector=${selector}`)
  if (response.status !== 200) throw new Error(`listing the EndpointSlices of ${serviceName} answered ${response.status}`)
  return readyOrigins(JSON.parse(response.body))
}

/** The storefront finished rolling out on a build that is not this image's. */
class DriftError extends Error {}

/**
 * Wait until the Deployments in `waitFor` have finished rolling out, then
 * return the ready storefront pods, each of which serves `ownBuild`.
 * The warm-up starts with the sync, beside the rollouts it waits for, so an
 * unfinished rollout, or a read that failed (the API server, a pod that has
 * just turned ready), is waited out (`pollMs`), up to `timeoutMs`. Once the
 * rollouts are done, a pod serving another build is not a rollout in
 * progress but a drift of this image's tag from the storefront's, and fails
 * at once.
 *
 * @param {{
 *   kube: { namespace: string, call: Function },
 *   serviceName: string,
 *   waitFor: string[],
 *   buildAt: (origin: string) => Promise<string | undefined>,
 *   ownBuild: string,
 *   pollMs: number,
 *   timeoutMs: number,
 * }} options
 * @returns {Promise<string[]>}
 */
export async function waitForRollout({ kube, serviceName, waitFor, buildAt, ownBuild, pollMs, timeoutMs }) {
  const deadline = performance.now() + timeoutMs
  for (;;) {
    let waiting
    try {
      const rolling = (await readDeployments(kube, waitFor))
        .filter(deployment => !rolloutComplete(deployment))
        .map(deployment => deployment.metadata.name)
      if (rolling.length) waiting = `the rollout of ${rolling.join(', ')}`
      else {
        const origins = await listReadyOrigins(kube, serviceName)
        const builds = await Promise.all(origins.map(origin => buildAt(origin).catch(() => undefined)))
        const drifted = builds.filter(build => build !== undefined && build !== ownBuild)
        if (drifted.length) {
          throw new DriftError(`this image is build ${ownBuild} but ${serviceName} serves ${[...new Set(drifted)].join(', ')} after its rollout: the warm-up's image tag is not the storefront's`)
        }
        if (origins.length && builds.every(build => build === ownBuild)) return origins
        waiting = origins.length ? `an answer from every pod of ${serviceName}` : `a ready pod of ${serviceName}`
      }
    }
    catch (error) {
      if (error instanceof DriftError) throw error
      waiting = String(error?.message ?? error)
    }
    if (performance.now() >= deadline) throw new Error(`still waiting after ${Math.round(timeoutMs / 1000)} s for ${waiting}`)
    log('info', 'waiting for the rollout', { waiting })
    await sleep(pollMs)
  }
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
  const waitFor = (process.env.WARM_WAIT_FOR ?? '').split(',').map(name => name.trim()).filter(Boolean)
  const pollMs = Number(process.env.WARM_POLL_SECONDS) * 1000
  const rolloutTimeoutMs = Number(process.env.WARM_ROLLOUT_TIMEOUT_SECONDS) * 1000
  const attempts = Number(process.env.WARM_ATTEMPTS)
  const retryMs = Number(process.env.WARM_RETRY_SECONDS) * 1000
  if (!target || !serviceName || !(concurrency > 0) || !(timeoutMs > 0) || !stateConfigMap
    || !waitFor.length || !(pollMs > 0) || !(rolloutTimeoutMs > 0)
    || !(Number.isInteger(attempts) && attempts > 0) || !(retryMs >= 0)) {
    throw new Error('WARM_TARGET, WARM_SERVICE, WARM_CONCURRENCY, WARM_TIMEOUT_MS, WARM_STATE_CONFIGMAP, WARM_WAIT_FOR, WARM_POLL_SECONDS, WARM_ROLLOUT_TIMEOUT_SECONDS, WARM_ATTEMPTS and WARM_RETRY_SECONDS are required')
  }
  // `origin` is the Service (the sitemaps: any pod serves them) or one pod.
  const get = (path, host, accept, userAgent = DEVICE_USER_AGENTS.desktop, origin = target) =>
    request(new URL(path, origin), { headers: { host, accept, 'user-agent': userAgent, [CACHE_WARM_HEADER]: '1' }, timeoutMs })

  const kube = kubernetes()
  const { namespace } = kube
  const ingresses = await listIngresses(kube)
  const candidates = storefrontHosts(ingresses, serviceName)
  if (!candidates.length) throw new Error(`no Ingress in ${namespace} routes / to ${serviceName}`)

  const ownBuild = JSON.parse(readFileSync(new URL('../public/_nuxt/builds/latest.json', import.meta.url), 'utf8')).id
  // The build a pod serves; `undefined` while it does not answer with one.
  const buildAt = async (origin) => {
    const served = await get('/_nuxt/builds/latest.json', candidates[0], 'application/json', DEVICE_USER_AGENTS.desktop, origin)
    return served.status === 200 ? JSON.parse(served.body).id : undefined
  }
  const waitStarted = performance.now()
  const origins = await waitForRollout({ kube, serviceName, waitFor, buildAt, ownBuild, pollMs, timeoutMs: rolloutTimeoutMs })
  const waitedSeconds = Math.round((performance.now() - waitStarted) / 1000)

  const warmed = await warmedBuild(kube, stateConfigMap)
  if (warmed === ownBuild) {
    log('info', 'build already warm', { namespace, build: ownBuild })
    return
  }

  // A pod the HPA adds is used once it is ready. A pod serving another
  // build is not (a newer rollout's: its cache is another build's); a pod
  // whose build could not be read is, as Kubernetes calls it ready.
  const listOrigins = async () => {
    const ready = await listReadyOrigins(kube, serviceName)
    const builds = await Promise.all(ready.map(origin => buildAt(origin).catch(() => undefined)))
    return ready.filter((_, index) => builds[index] === undefined || builds[index] === ownBuild)
  }
  // Canonical pages per store, read again on every try (a sitemap that
  // failed may be served now).
  async function readSitemaps() {
    // From each candidate host's own sitemap. A host that redirects (a
    // `www.` twin to its store) has no pages of its own; its store's
    // sitemap is read under the store's host.
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
    return { pages, redirectingHosts, failedSitemaps, stores }
  }

  // The build's own files first: a missing chunk breaks the page it is
  // wanted by, where a cold render is only slow.
  async function warmAssets(stores) {
    const assetsDir = new URL('../public/_nuxt/', import.meta.url)
    const assetFiles = readdirSync(assetsDir, { recursive: true, withFileTypes: true })
      .filter(entry => entry.isFile())
      .map(entry => relative(fileURLToPath(assetsDir), `${entry.parentPath}/${entry.name}`))
    const assetsStarted = performance.now()
    const assets = await warmEdgeAssets({ stores, paths: buildAssetPaths(assetFiles), concurrency: concurrency * origins.length, timeoutMs })
    log(assets.failed ? 'warn' : 'info', 'build assets requested through the public hosts', {
      build: ownBuild,
      hosts: stores,
      ...assets,
      seconds: Math.round((performance.now() - assetsStarted) / 1000),
    })
  }

  // One try: every page of `pages` on the ready pods. Returns whether the
  // build may be recorded (`warmedEveryStore`) and the try's summary.
  async function warmPages({ pages, redirectingHosts, failedSitemaps, stores }, tryOrigins) {
    const renderedByStore = new Map()
    const started = performance.now()
    const summary = { pages: pages.size, rendered: 0, payloads: 0, uncached: 0, failed: 0 }
    const queue = warmOrder([...pages.values()])
    let pagesDone = 0
    // A page's counts join the summary once it is done, so a page put back
    // because its pod vanished (`PodGone`) is counted once, where it finished.
    async function warmPage(page, origin) {
      const counts = { rendered: 0, payloads: 0, uncached: 0, failed: 0 }
      for (const [deviceClass, userAgent] of Object.entries(DEVICE_USER_AGENTS)) {
        try {
          const html = await get(page.pathname, page.host, 'text/html', userAgent, origin)
          if (html.status !== 200) {
            counts.failed++
            log('warn', 'page did not render', { host: page.host, path: page.pathname, deviceClass, status: html.status })
            break
          }
          counts.rendered++
          if (!isCachedResponse(html.headers)) {
            counts.uncached++
            break
          }
          if (!hasExtractedPayload(page.pathname)) continue
          const payload = await get(payloadPath(page.pathname, ownBuild), page.host, 'application/json', userAgent, origin)
          if (payload.status === 200) counts.payloads++
          else {
            counts.failed++
            log('warn', 'payload did not render', { host: page.host, path: page.pathname, deviceClass, status: payload.status })
          }
        }
        catch (error) {
          if (podGone(error)) {
            log('info', 'pod gone, page put back', { origin, host: page.host, path: page.pathname })
            throw new PodGone(origin)
          }
          counts.failed++
          log('warn', 'request failed', { host: page.host, path: page.pathname, deviceClass, error: String(error?.message ?? error) })
        }
      }
      for (const key of Object.keys(counts)) summary[key] += counts[key]
      if (counts.rendered) renderedByStore.set(page.host, (renderedByStore.get(page.host) ?? 0) + counts.rendered)
      pagesDone++
    }
    const pods = await forEachOnPods(queue, {
      origins: tryOrigins,
      listOrigins,
      concurrency,
      refreshMs: pollMs,
      work: warmPage,
      onRefresh: current => log('info', 'warming pages', {
        done: pagesDone,
        pages: pages.size,
        pods: current.length,
        seconds: Math.round((performance.now() - started) / 1000),
      }),
    })
    return {
      complete: warmedEveryStore({ failedSitemaps, unrequested: queue.length, stores, rendered: renderedByStore }),
      fields: {
        namespace,
        build: ownBuild,
        hosts: stores,
        storesWithoutRenders: stores.filter(store => !renderedByStore.has(store)),
        failedSitemaps,
        redirectingHosts,
        ...summary,
        // Pages no pod was left to render (every pod left the ready set).
        unrequested: queue.length,
        pods,
        waitedSeconds,
        seconds: Math.round((performance.now() - started) / 1000),
      },
    }
  }

  // An unrecorded try (a sitemap that failed, a store with nothing
  // rendered, pages no pod was left for) is tried again, up to
  // `attempts` in all, `retryMs` apart. The build's files go to the edge
  // once per store, on the first try that found the store.
  const assetStores = new Set()
  const run = await untilComplete({
    attempts,
    retryMs,
    tryOnce: async (attempt) => {
      const read = await readSitemaps()
      const newStores = read.stores.filter(store => !assetStores.has(store))
      if (newStores.length) {
        await warmAssets(newStores)
        newStores.forEach(store => assetStores.add(store))
      }
      return warmPages(read, attempt === 1 ? origins : await listOrigins().catch(() => origins))
    },
    onRetry: (failed, attempt) => log('warn', 'cache partly warmed, trying again', { ...failed.fields, attempt, attempts, retrySeconds: retryMs / 1000 }),
  })
  if (run.complete) {
    await recordWarmedBuild(kube, stateConfigMap, ownBuild)
    log('info', 'cache warmed', { ...run.fields, attempt: run.attempt })
  }
  else {
    log('error', 'cache partly warmed, build not recorded', { ...run.fields, attempt: run.attempt, attempts })
    process.exitCode = 1
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((error) => {
    log('error', 'cache warm-up could not run', { error: String(error?.message ?? error) })
    process.exit(1)
  })
}
