/**
 * The post-deploy cache warm-up (scripts/warm-cache.mjs) must request
 * exactly the cache keys visitors hit: every device class the SSR cache
 * varies on, the payload URL Nuxt's client fetches, and only the hosts the
 * Ingresses route to the storefront.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deviceClassFromUserAgent } from '~~/shared/utils/deviceClass'
import {
  buildAssetPaths,
  DEVICE_USER_AGENTS,
  envNumber,
  forEachOnPods,
  isCachedResponse,
  listReadyOrigins,
  localeOf,
  localePrefixes,
  localeTwin,
  payloadPath,
  PodGone,
  podGone,
  readDeployments,
  readyOrigins,
  recordWarmedBuild,
  rolloutComplete,
  sitemapLocations,
  sitemapReader,
  storefrontHosts,
  untilComplete,
  warmBuild,
  warmedBuild,
  warmedEveryStore,
  waitForRollout,
  warmOrder,
  withLocaleTwins,
} from '~~/scripts/warm-cache.mjs'

describe('DEVICE_USER_AGENTS', () => {
  it('holds one User-Agent per device class, classified into that class', () => {
    expect(Object.keys(DEVICE_USER_AGENTS).sort()).toEqual(['desktop', 'mobile', 'tablet'])
    for (const [deviceClass, userAgent] of Object.entries(DEVICE_USER_AGENTS)) {
      expect(deviceClassFromUserAgent(userAgent)).toBe(deviceClass)
    }
  })
})

describe('storefrontHosts', () => {
  const rule = (host: string | undefined, path: string, service: string) => ({
    host,
    http: { paths: [{ path, backend: { service: { name: service, port: { number: 80 } } } }] },
  })
  const ingresses = {
    items: [
      { spec: { rules: [rule('webside.gr', '/', 'frontend-nuxt-service'), rule('www.webside.gr', '/', 'frontend-nuxt-service')] } },
      { spec: { rules: [rule('webside.gr', '/mcp', 'agent-gateway-service')] } },
      { spec: { rules: [rule('webside.gr', '/api/contact/attachment', 'frontend-nuxt-service')] } },
      { spec: { rules: [rule('api.webside.gr', '/', 'backend-service')] } },
      { spec: { rules: [rule(undefined, '/', 'frontend-nuxt-service')] } },
      { spec: { rules: [rule('demo.grooveshop.space', '/', 'frontend-nuxt-service')] } },
    ],
  }

  it('keeps hosts whose / goes to the storefront, once each', () => {
    expect(storefrontHosts(ingresses, 'frontend-nuxt-service')).toEqual(['webside.gr', 'www.webside.gr', 'demo.grooveshop.space'])
  })

  it('skips path-routed services, other backends and the host-less catch-all', () => {
    expect(storefrontHosts(ingresses, 'backend-service')).toEqual(['api.webside.gr'])
  })
})

describe('sitemapLocations', () => {
  it('reads page URLs from a urlset, entities decoded', () => {
    const xml = '<?xml version="1.0"?><urlset><url><loc>https://webside.gr/</loc></url><url><loc> https://webside.gr/search?a=1&amp;b=2 </loc></url></urlset>'
    expect(sitemapLocations(xml)).toEqual({ sitemaps: [], pages: ['https://webside.gr/', 'https://webside.gr/search?a=1&b=2'] })
  })

  it('reads nested sitemaps from a sitemap index', () => {
    const xml = '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>https://webside.gr/__sitemap__/el-GR.xml</loc></sitemap></sitemapindex>'
    expect(sitemapLocations(xml)).toEqual({ sitemaps: ['https://webside.gr/__sitemap__/el-GR.xml'], pages: [] })
  })
})

describe('payloadPath', () => {
  it('matches the URL the client fetches (nuxt app/composables/payload.ts)', () => {
    expect(payloadPath('/')).toBe('/_payload.json')
    expect(payloadPath('/blog/post/4/slug')).toBe('/blog/post/4/slug/_payload.json')
    expect(payloadPath('/blog/')).toBe('/blog/_payload.json')
  })
})

describe('isCachedResponse', () => {
  it('recognises a cached page by the edge directive the storefront adds to it', () => {
    expect(isCachedResponse({ 'cache-control': 'no-cache', 'cloudflare-cdn-cache-control': 'max-age=60, stale-while-revalidate=86400' })).toBe(true)
    expect(isCachedResponse({ 'cache-control': 'no-cache' })).toBe(false)
    expect(isCachedResponse({ 'cache-control': 's-maxage=300, stale-while-revalidate' })).toBe(false)
    expect(isCachedResponse({})).toBe(false)
  })
})

describe('warmOrder', () => {
  it('puts shallow pages first and keeps sitemap order within a depth', () => {
    const page = (pathname: string) => ({ host: 'webside.gr', pathname })
    expect(warmOrder([page('/blog/post/1/a'), page('/blog'), page('/'), page('/products'), page('/blog/category/1/x')]).map((p: { pathname: string }) => p.pathname))
      .toEqual(['/', '/blog', '/products', '/blog/post/1/a', '/blog/category/1/x'])
  })

  it('ranks a page in another locale with its default-locale twin', () => {
    const page = (pathname: string, locale = '') => ({ host: 'demo.grooveshop.space', pathname, locale })
    expect(warmOrder([page('/products/1/a'), page('/en/products/1/a', '/en'), page('/en/products', '/en'), page('/en', '/en')]).map((p: { pathname: string }) => p.pathname))
      .toEqual(['/en', '/en/products', '/products/1/a', '/en/products/1/a'])
  })
})

describe('localePrefixes', () => {
  // The shape @nuxtjs/sitemap serves (demo.grooveshop.space, 2026-10-21).
  const entry = (loc: string, alternates: string[] = []) =>
    `<url><loc>${loc}</loc>${alternates.map(href => `<xhtml:link rel="alternate" hreflang="x" href="${href}" />`).join('')}</url>`

  it('reads the other locales a store serves from its home page alternates', () => {
    const xml = `<urlset>${entry('https://demo.grooveshop.space/about', ['https://demo.grooveshop.space/en/about'])}${entry('https://demo.grooveshop.space/', ['https://demo.grooveshop.space/', 'https://demo.grooveshop.space/en', 'https://demo.grooveshop.space/'])}</urlset>`
    expect(localePrefixes(xml)).toEqual(['/en'])
  })

  it('finds none for a store that serves one locale', () => {
    const xml = `<urlset>${entry('https://webside.gr/')}${entry('https://webside.gr/about')}</urlset>`
    expect(localePrefixes(xml)).toEqual([])
  })
})

describe('warmedEveryStore', () => {
  const rendered = (counts: Record<string, number>) => new Map(Object.entries(counts))

  it('does not record a run whose sitemaps all failed (Django restarting after the deploy)', () => {
    expect(warmedEveryStore({
      failedSitemaps: ['webside.gr/sitemap.xml', 'demo.grooveshop.space/sitemap.xml'],
      unrequested: 0,
      stores: [],
      rendered: rendered({}),
    })).toBe(false)
  })

  it('does not record a run in which no page rendered', () => {
    expect(warmedEveryStore({
      failedSitemaps: [],
      unrequested: 0,
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({}),
    })).toBe(false)
  })

  it('records a run that rendered every store, a few stale URLs failing among them', () => {
    // 282 pages listed, three of them no longer render: counted, not a reason.
    expect(warmedEveryStore({
      failedSitemaps: [],
      unrequested: 0,
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({ 'webside.gr': 106, 'demo.grooveshop.space': 120 }),
    })).toBe(true)
  })

  it('does not record a run in which one store\'s sitemap failed, the others warm', () => {
    expect(warmedEveryStore({
      failedSitemaps: ['ekfyseosfyteias.com/sitemap.xml'],
      unrequested: 0,
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({ 'webside.gr': 106, 'demo.grooveshop.space': 120 }),
    })).toBe(false)
  })

  it('does not record a run in which one store rendered nothing', () => {
    expect(warmedEveryStore({
      failedSitemaps: [],
      unrequested: 0,
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({ 'webside.gr': 106 }),
    })).toBe(false)
  })

  it('does not record a run that left pages unrequested (every pod left the ready set)', () => {
    expect(warmedEveryStore({
      failedSitemaps: [],
      unrequested: 40,
      stores: ['webside.gr', 'demo.grooveshop.space'],
      rendered: rendered({ 'webside.gr': 106, 'demo.grooveshop.space': 120 }),
    })).toBe(false)
  })
})

type Call = { path: string, method: string, contentType?: string, body?: unknown }
// The Kubernetes API as `kubernetes()` exposes it, answering from a
// script and recording what it was asked.
function fakeKube(...answers: Array<{ status: number, body?: unknown }>) {
  const calls: Call[] = []
  return {
    calls,
    kube: {
      namespace: 'grooveshop',
      call: async (path: string, { method = 'GET', contentType, body }: Omit<Call, 'path'> = { method: 'GET' }) => {
        calls.push({ path, method, contentType, body })
        const answer = answers.shift() ?? { status: 500 }
        return { status: answer.status, headers: {}, body: JSON.stringify(answer.body ?? {}), ms: 0 }
      },
    },
  }
}

describe('the build last warmed', () => {
  it('reads the build from the ConfigMap, and none before the first run', async () => {
    const recorded = fakeKube({ status: 200, body: { data: { warmedBuild: 'b1' } } })
    expect(await warmedBuild(recorded.kube, 'storefront-warm-state')).toBe('b1')
    expect(recorded.calls[0]?.path).toBe('/api/v1/namespaces/{namespace}/configmaps/storefront-warm-state')

    expect(await warmedBuild(fakeKube({ status: 404 }).kube, 'storefront-warm-state')).toBeUndefined()
  })

  it('refuses to guess when the ConfigMap cannot be read', async () => {
    await expect(warmedBuild(fakeKube({ status: 403 }).kube, 'storefront-warm-state')).rejects.toThrow('403')
  })

  it('records the build in the ConfigMap, creating it on the first run', async () => {
    const existing = fakeKube({ status: 200 })
    await recordWarmedBuild(existing.kube, 'storefront-warm-state', 'b2')
    expect(existing.calls).toEqual([{
      path: '/api/v1/namespaces/{namespace}/configmaps/storefront-warm-state',
      method: 'PATCH',
      contentType: 'application/merge-patch+json',
      body: { data: { warmedBuild: 'b2' } },
    }])

    const absent = fakeKube({ status: 404 }, { status: 201 })
    await recordWarmedBuild(absent.kube, 'storefront-warm-state', 'b2')
    expect(absent.calls[1]).toEqual({
      path: '/api/v1/namespaces/{namespace}/configmaps',
      method: 'POST',
      contentType: 'application/json',
      body: { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'storefront-warm-state' }, data: { warmedBuild: 'b2' } },
    })
  })
})

describe('localeOf and localeTwin', () => {
  it('names the locale prefix a page is under, and none for the default locale', () => {
    expect(localeOf('/en', ['/en'])).toBe('/en')
    expect(localeOf('/en/products/1/a', ['/en'])).toBe('/en')
    expect(localeOf('/products/1/a', ['/en'])).toBe('')
    // A first segment that merely starts with the prefix is not under it.
    expect(localeOf('/energy', ['/en'])).toBe('')
  })

  it('places a default-locale page under a prefix, the home page as the bare prefix', () => {
    expect(localeTwin('/', '/en')).toBe('/en')
    expect(localeTwin('/products/1/a', '/en')).toBe('/en/products/1/a')
  })
})

describe('buildAssetPaths', () => {
  it('lists the files visitors fetch, without precompressed twins or build metadata', () => {
    const files = [
      'CKamTKbv-069bd808.js',
      'CKamTKbv-069bd808.js.br',
      'CKamTKbv-069bd808.js.gz',
      'entry.Bx1.css',
      'entry.Bx1.css.br',
      'fonts/abc.woff2',
      'builds/latest.json',
      'builds/meta/a1747d51.json',
    ]

    expect(buildAssetPaths(files)).toEqual([
      '/_nuxt/CKamTKbv-069bd808.js',
      '/_nuxt/entry.Bx1.css',
      '/_nuxt/fonts/abc.woff2',
    ])
  })

  it('writes Windows separators as URL slashes', () => {
    expect(buildAssetPaths(['fonts\\abc.woff2', 'builds\\latest.json'])).toEqual(['/_nuxt/fonts/abc.woff2'])
  })
})

describe('rolloutComplete', () => {
  // `kubectl rollout status`'s rule, on the fields the API reports.
  const deployment = (status: Record<string, number>, { generation = 4, replicas = 2 } = {}) => ({
    metadata: { name: 'frontend-nuxt', generation },
    spec: { replicas },
    status: { observedGeneration: 4, replicas: 2, updatedReplicas: 2, availableReplicas: 2, ...status },
  })

  it('is complete when every replica runs the latest spec and is available', () => {
    expect(rolloutComplete(deployment({}))).toBe(true)
  })

  it('waits for the controller to see the latest spec', () => {
    expect(rolloutComplete(deployment({}, { generation: 5 }))).toBe(false)
  })

  it('waits for new replicas, for old ones to go, and for the new ones to be available', () => {
    expect(rolloutComplete(deployment({ updatedReplicas: 1, replicas: 3 }))).toBe(false)
    expect(rolloutComplete(deployment({ replicas: 3 }))).toBe(false)
    expect(rolloutComplete(deployment({ availableReplicas: 1 }))).toBe(false)
  })

  it('waits for the replicas the HPA asked for', () => {
    expect(rolloutComplete(deployment({}, { replicas: 4 }))).toBe(false)
  })
})

describe('readyOrigins', () => {
  const slice = (endpoints: Array<{ ip: string, ready?: boolean }>, { addressType = 'IPv4', ports = [{ name: 'http', port: 3000 }] } = {}) => ({
    metadata: { name: 'frontend-nuxt-service-abcde' },
    addressType,
    ports,
    endpoints: endpoints.map(({ ip, ready }) => ({ addresses: [ip], conditions: ready === undefined ? {} : { ready } })),
  })

  it('names each ready pod by address and target port, once', () => {
    const list = { items: [slice([{ ip: '10.42.0.7', ready: true }, { ip: '10.42.1.9' }]), slice([{ ip: '10.42.0.7', ready: true }])] }
    expect(readyOrigins(list)).toEqual(['http://10.42.0.7:3000', 'http://10.42.1.9:3000'])
  })

  it('leaves out a pod that is not ready, terminating ones included', () => {
    expect(readyOrigins({ items: [slice([{ ip: '10.42.0.7', ready: false }, { ip: '10.42.1.9', ready: true }])] }))
      .toEqual(['http://10.42.1.9:3000'])
  })

  it('brackets an IPv6 address', () => {
    expect(readyOrigins({ items: [slice([{ ip: 'fd00::7', ready: true }], { addressType: 'IPv6' })] })).toEqual(['http://[fd00::7]:3000'])
  })

  it('refuses to guess the port of a Service with several', () => {
    const ports = [{ name: 'http', port: 3000 }, { name: 'metrics', port: 9100 }]
    expect(() => readyOrigins({ items: [slice([{ ip: '10.42.0.7' }], { ports })] })).toThrow('2 ports')
  })

  it('skips a slice with no ready pod', () => {
    expect(readyOrigins({ items: [slice([{ ip: '10.42.0.7', ready: false }], { ports: [] })] })).toEqual([])
  })
})

describe('the Kubernetes reads of the rollout wait', () => {
  it('reads each Deployment by name and refuses a failed read', async () => {
    const api = fakeKube({ status: 200, body: { metadata: { name: 'frontend-nuxt' } } }, { status: 200, body: { metadata: { name: 'backend' } } })
    const deployments = await readDeployments(api.kube, ['frontend-nuxt', 'backend'])
    expect(deployments.map(deployment => deployment.metadata.name)).toEqual(['frontend-nuxt', 'backend'])
    expect(api.calls.map(call => call.path)).toEqual([
      '/apis/apps/v1/namespaces/{namespace}/deployments/frontend-nuxt',
      '/apis/apps/v1/namespaces/{namespace}/deployments/backend',
    ])
    await expect(readDeployments(fakeKube({ status: 403 }).kube, ['backend'])).rejects.toThrow('403')
  })

  it('lists the Service\'s EndpointSlices by its label', async () => {
    const api = fakeKube({ status: 200, body: { items: [{ ports: [{ port: 3000 }], endpoints: [{ addresses: ['10.42.0.7'], conditions: { ready: true } }] }] } })
    expect(await listReadyOrigins(api.kube, 'frontend-nuxt-service')).toEqual(['http://10.42.0.7:3000'])
    expect(api.calls[0]?.path).toBe('/apis/discovery.k8s.io/v1/namespaces/{namespace}/endpointslices?labelSelector=kubernetes.io%2Fservice-name%3Dfrontend-nuxt-service')
  })
})

describe('forEachOnPods', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  // Work that takes 3 ms of fake time and records where it ran and how many
  // items each pod had in flight at most.
  function recorder() {
    const ranOn: Record<string, number[]> = {}
    const inFlight: Record<string, number> = {}
    const peakInFlight: Record<string, number> = {}
    return {
      ranOn,
      peakInFlight,
      work: async (item: number, origin: string) => {
        inFlight[origin] = (inFlight[origin] ?? 0) + 1
        peakInFlight[origin] = Math.max(peakInFlight[origin] ?? 0, inFlight[origin]!)
        await new Promise(resolve => setTimeout(resolve, 3))
        ;(ranOn[origin] ??= []).push(item)
        inFlight[origin]!--
      },
    }
  }
  const items = (count: number) => Array.from({ length: count }, (_, index) => index)
  // Run the pool to the end on fake time.
  async function drain<T>(run: Promise<T>): Promise<T> {
    let settled = false
    void run.then(() => {
      settled = true
    }, () => {
      settled = true
    })
    while (!settled) await vi.advanceTimersByTimeAsync(1)
    return run
  }

  it('starts on the pods it is given, without reading them again', async () => {
    const run = recorder()
    const listOrigins = vi.fn(async () => ['http://b:3000'])
    await drain(forEachOnPods(items(4), { origins: ['http://a:3000'], listOrigins, concurrency: 1, refreshMs: 1000, work: run.work }))
    expect(listOrigins).not.toHaveBeenCalled()
    expect(run.ranOn['http://a:3000']).toHaveLength(4)
  })

  it('spreads the items over every pod, the concurrency on each', async () => {
    const run = recorder()
    const queue = items(12)
    const origins = ['http://a:3000', 'http://b:3000']
    const peak = await drain(forEachOnPods(queue, { origins, listOrigins: async () => origins, concurrency: 2, refreshMs: 1000, work: run.work }))

    expect(peak).toBe(2)
    expect(queue).toEqual([])
    expect(Object.values(run.ranOn).flat().sort((a, b) => a - b)).toEqual(items(12))
    expect(run.peakInFlight).toEqual({ 'http://a:3000': 2, 'http://b:3000': 2 })
  })

  it('gives a pod that becomes ready its share, and none to a pod that left', async () => {
    const run = recorder()
    const peak = await drain(forEachOnPods(items(30), { origins: ['http://a:3000'], listOrigins: async () => ['http://b:3000'], concurrency: 1, refreshMs: 10, work: run.work }))

    expect(peak).toBe(1)
    expect(run.ranOn['http://a:3000']?.length).toBeGreaterThan(0)
    expect(run.ranOn['http://b:3000']?.length).toBeGreaterThan(0)
    // Once b replaced a, a took nothing new: every item a ran precedes b's first.
    expect(Math.max(...run.ranOn['http://a:3000']!)).toBeLessThan(Math.min(...run.ranOn['http://b:3000']!))
    expect(Object.values(run.ranOn).flat()).toHaveLength(30)
  })

  it('keeps a pod that left and came back at its concurrency', async () => {
    // a is dropped by the read at 2 ms and listed again by the one at 4 ms,
    // while its worker is still inside its first item (until 10 ms).
    const inFlight: Record<string, number> = {}
    const peakInFlight: Record<string, number> = {}
    const ran: number[] = []
    let firstOnA = true
    const work = async (item: number, origin: string) => {
      inFlight[origin] = (inFlight[origin] ?? 0) + 1
      peakInFlight[origin] = Math.max(peakInFlight[origin] ?? 0, inFlight[origin]!)
      const hold = origin === 'http://a:3000' && firstOnA ? 10 : 3
      if (origin === 'http://a:3000') firstOnA = false
      await new Promise(resolve => setTimeout(resolve, hold))
      ran.push(item)
      inFlight[origin]!--
    }
    const lists = [['http://b:3000'], ['http://a:3000', 'http://b:3000']]
    const listOrigins = vi.fn(async () => lists.shift() ?? ['http://a:3000', 'http://b:3000'])
    const queue = items(40)
    await drain(forEachOnPods(queue, { origins: ['http://a:3000'], listOrigins, concurrency: 1, refreshMs: 2, work }))

    expect(listOrigins.mock.calls.length).toBeGreaterThanOrEqual(2)
    expect(peakInFlight['http://a:3000']).toBe(1)
    expect(queue).toEqual([])
    expect(ran.sort((a, b) => a - b)).toEqual(items(40))
  })

  it('puts the item back and drops a pod that is gone, until a read lists it again', async () => {
    const run = recorder()
    const work = async (item: number, origin: string) => {
      if (origin === 'http://gone:3000') throw new PodGone(origin)
      await run.work(item, origin)
    }
    const queue = items(10)
    await drain(forEachOnPods(queue, { origins: ['http://gone:3000', 'http://a:3000'], listOrigins: async () => ['http://a:3000'], concurrency: 1, refreshMs: 1000, work }))

    expect(queue).toEqual([])
    expect(run.ranOn['http://a:3000']?.sort((a, b) => a - b)).toEqual(items(10))
  })

  it('reads the pods again when every worker lost its pod, and finishes on the pods still listed', async () => {
    // Both containers restart at once: each refuses one connection while
    // every read still lists it.
    const run = recorder()
    const refused = new Set<string>()
    const work = async (item: number, origin: string) => {
      if (item >= 2 && !refused.has(origin)) {
        refused.add(origin)
        throw new PodGone(origin)
      }
      await run.work(item, origin)
    }
    const origins = ['http://a:3000', 'http://b:3000']
    const listOrigins = vi.fn(async () => origins)
    const queue = items(20)
    await drain(forEachOnPods(queue, { origins, listOrigins, concurrency: 1, refreshMs: 1000, work }))

    expect(listOrigins).toHaveBeenCalled()
    expect(queue).toEqual([])
    expect(Object.values(run.ranOn).flat().sort((a, b) => a - b)).toEqual(items(20))
  })

  it('stops with items left when the read after every pod was lost lists none', async () => {
    const work = async (_item: number, origin: string) => {
      throw new PodGone(origin)
    }
    const listOrigins = vi.fn(async (): Promise<string[]> => [])
    const queue = items(5)
    await drain(forEachOnPods(queue, { origins: ['http://a:3000'], listOrigins, concurrency: 1, refreshMs: 1000, work }))

    expect(listOrigins).toHaveBeenCalledTimes(1)
    expect(queue).toEqual(items(5))
  })

  it('waits a refresh before it reads the pods again', async () => {
    const work = async (_item: number, origin: string) => {
      throw new PodGone(origin)
    }
    const listOrigins = vi.fn(async (): Promise<string[]> => [])
    const run = forEachOnPods(items(3), { origins: ['http://a:3000'], listOrigins, concurrency: 1, refreshMs: 1000, work })

    await vi.advanceTimersByTimeAsync(999)
    expect(listOrigins).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(listOrigins).toHaveBeenCalledTimes(1)
    await drain(run)
  })

  it('stops with items left when a pod stays listed but refuses every connection', async () => {
    const attempts = vi.fn()
    const work = async (_item: number, origin: string) => {
      attempts(origin)
      throw new PodGone(origin)
    }
    const listOrigins = vi.fn(async () => ['http://a:3000'])
    const queue = items(5)
    await drain(forEachOnPods(queue, { origins: ['http://a:3000'], listOrigins, concurrency: 1, refreshMs: 1000, work }))

    // One read after the first stall; the second stall, with nothing done
    // since, ends it.
    expect(listOrigins).toHaveBeenCalledTimes(1)
    expect(attempts).toHaveBeenCalledTimes(2)
    expect(queue).toEqual(items(5))
  })

  it('keeps reading the pods while each read leads to progress', async () => {
    // a refuses one connection after every two items, b is never listed.
    const run = recorder()
    let sinceRefusal = 0
    const work = async (item: number, origin: string) => {
      if (sinceRefusal === 2) {
        sinceRefusal = 0
        throw new PodGone(origin)
      }
      sinceRefusal++
      await run.work(item, origin)
    }
    const queue = items(9)
    await drain(forEachOnPods(queue, { origins: ['http://a:3000'], listOrigins: async () => ['http://a:3000'], concurrency: 1, refreshMs: 1000, work }))

    expect(queue).toEqual([])
    expect(run.ranOn['http://a:3000']).toEqual(items(9))
  })

  it('fails on another error from the work that lands while the pods are being read', async () => {
    // The refresh at 5 ms waits 20 ms for its read; item 0 fails at 7 ms,
    // and the other worker drains the queue before the read returns.
    const work = async (item: number) => {
      await new Promise(resolve => setTimeout(resolve, item === 0 ? 7 : 1))
      if (item === 0) throw new Error('a bug')
    }
    const listOrigins = async () => {
      await new Promise(resolve => setTimeout(resolve, 20))
      return ['http://a:3000']
    }
    await expect(drain(forEachOnPods(items(20), { origins: ['http://a:3000'], listOrigins, concurrency: 2, refreshMs: 5, work }))).rejects.toThrow('a bug')
  })

  it('fails on any other error from the work', async () => {
    const work = async () => {
      throw new Error('a bug')
    }
    await expect(drain(forEachOnPods(items(2), { origins: ['http://a:3000'], listOrigins: async () => ['http://a:3000'], concurrency: 1, refreshMs: 1000, work }))).rejects.toThrow('a bug')
  })

  it('keeps its pods when a refresh cannot be read', async () => {
    const run = recorder()
    const listOrigins = vi.fn(async (): Promise<string[]> => {
      throw new Error('API server restarting')
    })
    await drain(forEachOnPods(items(10), { origins: ['http://a:3000'], listOrigins, concurrency: 1, refreshMs: 5, work: run.work }))

    expect(listOrigins).toHaveBeenCalled()
    expect(run.ranOn['http://a:3000']).toHaveLength(10)
  })

  it('reports the pods it works on at each refresh', async () => {
    const seen: string[][] = []
    const origins = ['http://a:3000', 'http://b:3000']
    await drain(forEachOnPods(items(10), {
      origins,
      listOrigins: async () => origins,
      concurrency: 1,
      refreshMs: 5,
      work: () => new Promise(resolve => setTimeout(resolve, 3)),
      onRefresh: current => seen.push(current),
    }))

    expect(seen.length).toBeGreaterThan(0)
    expect(seen.every(current => current.length === 2)).toBe(true)
  })
})

describe('untilComplete', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('tries again after the wait until a try completes', async () => {
    const tries = [{ complete: false }, { complete: true }]
    const tryOnce = vi.fn(async () => tries.shift()!)
    const onRetry = vi.fn()
    const result = untilComplete({ attempts: 3, retryMs: 300_000, tryOnce, onRetry })

    await vi.advanceTimersByTimeAsync(0)
    expect(tryOnce).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(299_999)
    expect(tryOnce).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    expect(await result).toEqual({ complete: true, attempt: 2 })
    expect(onRetry).toHaveBeenCalledTimes(1)
  })

  it('gives up after the last try, which it returns unrecorded', async () => {
    const tryOnce = vi.fn(async () => ({ complete: false }))
    const result = untilComplete({ attempts: 3, retryMs: 1000, tryOnce, onRetry: () => {} })
    await vi.advanceTimersByTimeAsync(2000)

    expect(await result).toEqual({ complete: false, attempt: 3 })
    expect(tryOnce).toHaveBeenCalledTimes(3)
  })

  it('tries once when one try is all it has', async () => {
    const tryOnce = vi.fn(async () => ({ complete: false }))
    expect(await untilComplete({ attempts: 1, retryMs: 1000, tryOnce, onRetry: () => {} })).toEqual({ complete: false, attempt: 1 })
    expect(tryOnce).toHaveBeenCalledTimes(1)
  })
})

describe('podGone', () => {
  it('reads a refused or unreachable connection as a pod that is gone, a timeout as a slow render', () => {
    const error = (code: string) => Object.assign(new Error(code), { code })
    expect(podGone(error('ECONNREFUSED'))).toBe(true)
    expect(podGone(error('EHOSTUNREACH'))).toBe(true)
    expect(podGone(error('ETIMEDOUT'))).toBe(false)
    expect(podGone(new Error('timed out after 60000 ms'))).toBe(false)
  })
})

describe('waitForRollout', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })
  // Run the wait to the end on fake time.
  async function settle<T>(run: Promise<T>): Promise<T> {
    let settled = false
    void run.then(() => {
      settled = true
    }, () => {
      settled = true
    })
    while (!settled) await vi.advanceTimersByTimeAsync(1)
    return run
  }
  const rolled = { metadata: { name: 'frontend-nuxt', generation: 2 }, spec: { replicas: 2 }, status: { observedGeneration: 2, replicas: 2, updatedReplicas: 2, availableReplicas: 2 } }
  const rolling = { ...rolled, status: { ...rolled.status, replicas: 3, updatedReplicas: 1 } }
  const slices = (...ips: string[]) => ({ items: [{ ports: [{ port: 3000 }], endpoints: ips.map(ip => ({ addresses: [ip], conditions: { ready: true } })) }] })
  const options = { serviceName: 'frontend-nuxt-service', waitFor: ['frontend-nuxt'], ownBuild: 'b2', pollMs: 1, timeoutMs: 2000 }

  it('waits out the rollout, then answers the pods that serve this build', async () => {
    const api = fakeKube({ status: 200, body: rolling }, { status: 200, body: rolled }, { status: 200, body: slices('10.42.0.7', '10.42.1.9') })
    const origins = await settle(waitForRollout({ ...options, kube: api.kube, buildAt: async () => 'b2' }))
    expect(origins).toEqual(['http://10.42.0.7:3000', 'http://10.42.1.9:3000'])
    expect(api.calls).toHaveLength(3)
  })

  it('waits out a failed read and a pod that does not answer yet', async () => {
    const api = fakeKube(
      { status: 503 },
      { status: 200, body: rolled },
      { status: 200, body: slices('10.42.0.7') },
      { status: 200, body: rolled },
      { status: 200, body: slices('10.42.0.7') },
    )
    const answers = [undefined, 'b2']
    const origins = await settle(waitForRollout({ ...options, kube: api.kube, buildAt: async () => answers.shift() }))
    expect(origins).toEqual(['http://10.42.0.7:3000'])
  })

  it('fails when the next read still finds the storefront on another build after its rollout', async () => {
    const api = fakeKube(
      { status: 200, body: rolled },
      { status: 200, body: slices('10.42.0.7', '10.42.1.9') },
      { status: 200, body: rolled },
      { status: 200, body: slices('10.42.0.7', '10.42.1.9') },
    )
    await expect(settle(waitForRollout({ ...options, kube: api.kube, buildAt: async origin => origin.includes('10.42.0.7') ? 'b2' : 'b1' })))
      .rejects
      .toThrow('serves b1 after its rollout')
    expect(api.calls).toHaveLength(4)
  })

  it('waits out an old pod listed ready for a moment after the rollout', async () => {
    // The EndpointSlice still lists the old pod (b1, in its preStop sleep)
    // on the first read; the next one has dropped it.
    const api = fakeKube(
      { status: 200, body: rolled },
      { status: 200, body: slices('10.42.0.7', '10.42.1.9') },
      { status: 200, body: rolled },
      { status: 200, body: slices('10.42.0.7') },
    )
    const origins = await settle(waitForRollout({ ...options, kube: api.kube, buildAt: async origin => origin.includes('10.42.0.7') ? 'b2' : 'b1' }))
    expect(origins).toEqual(['http://10.42.0.7:3000'])
  })

  it('gives up on a rollout that does not finish in time', async () => {
    const api = { namespace: 'grooveshop', call: async () => ({ status: 200, headers: {}, body: JSON.stringify(rolling), ms: 0 }) }
    await expect(settle(waitForRollout({ ...options, kube: api, buildAt: async () => 'b2', timeoutMs: 5 })))
      .rejects
      .toThrow('for the rollout of frontend-nuxt')
  })
})

describe('envNumber', () => {
  it('reads a number, and refuses a blank, unset or non-numeric value', () => {
    expect(envNumber('300')).toBe(300)
    expect(envNumber(' 0 ')).toBe(0)
    expect(envNumber('')).toBeNaN()
    expect(envNumber('  ')).toBeNaN()
    expect(envNumber(undefined)).toBeNaN()
    expect(envNumber('five')).toBeNaN()
    expect(envNumber('Infinity')).toBeNaN()
  })
})

describe('warmBuild', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  type Page = { host: string, pathname: string }
  type Sitemap = { host: string, path: string }
  const page = (host: string, pathname: string): Page => ({ host, pathname })
  const pagesOf = (...list: Page[]) => new Map(list.map(item => [`${item.host}${item.pathname}`, item]))
  const counts = (rendered: number) => ({ rendered, payloads: 0, uncached: 0, failed: rendered ? 0 : 1 })
  type Counts = ReturnType<typeof counts>
  const roots: Sitemap[] = [{ host: 'a.test', path: '/sitemap.xml' }, { host: 'b.test', path: '/sitemap.xml' }]

  /**
   * A fake world: each try's sitemap answers in `reads` (by sitemap path,
   * "a.test/sitemap.xml"), each page rendering unless listed in `failing`
   * for that try. Records what each try read and requested.
   */
  function world({ reads, failing = [] }: { reads: Record<string, Page[] | 'failed'>[], failing?: string[][] }) {
    const readsPerTry: string[][] = []
    const requestedPerTry: string[][] = []
    const assets: string[][] = []
    const lines: { level: string, message: string, fields: Record<string, unknown> }[] = []
    const record = vi.fn(async () => {})
    // Tries finished: the sitemap answers of the next try are reads[triesDone].
    let triesDone = 0
    const options = {
      attempts: 3,
      retryMs: 300_000,
      sitemaps: roots,
      readSitemaps: async (sitemaps: Sitemap[]) => {
        const answers = reads[triesDone] ?? {}
        readsPerTry.push(sitemaps.map(({ host, path }) => `${host}${path}`))
        const pages = new Map<string, Page>()
        const failed: Sitemap[] = []
        for (const sitemap of sitemaps) {
          const answer = answers[`${sitemap.host}${sitemap.path}`] ?? 'failed'
          if (answer === 'failed') failed.push(sitemap)
          else for (const [key, value] of pagesOf(...answer)) pages.set(key, value)
        }
        return { pages, failed, redirectingHosts: [] }
      },
      warmAssets: async (stores: string[]) => {
        assets.push(stores)
      },
      warmPages: async (queue: Page[], tryNumber: number, onPage: (page: Page, done: Counts) => void) => {
        triesDone = tryNumber
        requestedPerTry.push(queue.map(item => `${item.host}${item.pathname}`))
        for (let item = queue.shift(); item; item = queue.shift()) {
          onPage(item, counts((failing[tryNumber - 1] ?? []).includes(`${item.host}${item.pathname}`) ? 0 : 3))
        }
        return 2
      },
      record,
      log: (level: string, message: string, fields: Record<string, unknown> = {}) => {
        lines.push({ level, message, fields })
      },
      fields: { build: 'build-1' },
    }
    return { options, readsPerTry, requestedPerTry, assets, lines, record }
  }

  async function settle<T>(run: Promise<T>): Promise<T> {
    await vi.runAllTimersAsync()
    return run
  }

  it('records the build after one complete try', async () => {
    const run = world({ reads: [{ 'a.test/sitemap.xml': [page('a.test', '/'), page('a.test', '/products')], 'b.test/sitemap.xml': [page('b.test', '/')] }] })

    expect(await settle(warmBuild(run.options))).toBe(0)
    expect(run.record).toHaveBeenCalledTimes(1)
    expect(run.lines.at(-1)).toMatchObject({ level: 'info', message: 'cache warmed', fields: { build: 'build-1', attempt: 1, pages: 3 } })
  })

  it('reads only the sitemap that failed on the next try, and requests only the pages not done', async () => {
    const run = world({
      reads: [
        { 'a.test/sitemap.xml': [page('a.test', '/'), page('a.test', '/products')] },
        { 'b.test/sitemap.xml': [page('b.test', '/')] },
      ],
    })

    expect(await settle(warmBuild(run.options))).toBe(0)
    expect(run.readsPerTry).toEqual([['a.test/sitemap.xml', 'b.test/sitemap.xml'], ['b.test/sitemap.xml']])
    expect(run.requestedPerTry).toEqual([['a.test/', 'a.test/products'], ['b.test/']])
    expect(run.lines.find(line => line.message === 'cache partly warmed, trying again')).toMatchObject({ level: 'warn', fields: { failedSitemaps: ['b.test/sitemap.xml'], attempt: 1 } })
    expect(run.record).toHaveBeenCalledTimes(1)
  })

  it('sends each store\'s build files to the edge once, on the first try that found it', async () => {
    const run = world({
      reads: [
        { 'a.test/sitemap.xml': [page('a.test', '/')] },
        { 'b.test/sitemap.xml': [page('b.test', '/')] },
      ],
    })
    await settle(warmBuild(run.options))

    expect(run.assets).toEqual([['a.test'], ['b.test']])
  })

  it('asks again for the pages of a store that rendered nothing, not for those of a store that did', async () => {
    const both = { 'a.test/sitemap.xml': [page('a.test', '/')], 'b.test/sitemap.xml': [page('b.test', '/'), page('b.test', '/blog')] }
    const run = world({ reads: [both], failing: [['b.test/', 'b.test/blog']] })

    expect(await settle(warmBuild(run.options))).toBe(0)
    expect(run.requestedPerTry).toEqual([['a.test/', 'b.test/', 'b.test/blog'], ['b.test/', 'b.test/blog']])
  })

  it('logs an error and exits 1 when the last try still leaves the build unrecorded', async () => {
    const run = world({ reads: [{ 'a.test/sitemap.xml': [page('a.test', '/')] }] })

    expect(await settle(warmBuild(run.options))).toBe(1)
    expect(run.record).not.toHaveBeenCalled()
    expect(run.readsPerTry).toEqual([['a.test/sitemap.xml', 'b.test/sitemap.xml'], ['b.test/sitemap.xml'], ['b.test/sitemap.xml']])
    // a.test's page was done on the first try and never asked for again.
    expect(run.requestedPerTry).toEqual([['a.test/'], [], []])
    expect(run.lines.filter(line => line.level === 'warn')).toHaveLength(2)
    expect(run.lines.at(-1)).toMatchObject({
      level: 'error',
      message: 'cache partly warmed, build not recorded',
      fields: { attempt: 3, attempts: 3, failedSitemaps: ['b.test/sitemap.xml'], build: 'build-1' },
    })
  })

  it('requests a page a later read adds, such as a twin, and not a page already done', async () => {
    const run = world({
      reads: [
        { 'a.test/sitemap.xml': [page('a.test', '/products/1')] },
        // The second try learns a.test's locales: it lists the twin.
        { 'b.test/sitemap.xml': [page('b.test', '/')] },
      ],
    })
    const readSitemaps = run.options.readSitemaps
    run.options.readSitemaps = async (sitemaps) => {
      const read = await readSitemaps(sitemaps)
      if (run.readsPerTry.length === 2) {
        read.pages.set('a.test/products/1', page('a.test', '/products/1'))
        read.pages.set('a.test/en/products/1', page('a.test', '/en/products/1'))
      }
      return read
    }

    expect(await settle(warmBuild(run.options))).toBe(0)
    expect(run.requestedPerTry).toEqual([['a.test/products/1'], ['b.test/', 'a.test/en/products/1']])
  })

  it('counts pages no pod took as unrequested, and asks for them on the next try', async () => {
    const run = world({ reads: [{ 'a.test/sitemap.xml': [page('a.test', '/'), page('a.test', '/products')], 'b.test/sitemap.xml': [page('b.test', '/')] }] })
    const warmPages = run.options.warmPages
    let first = true
    run.options.warmPages = async (queue, tryNumber, onPage) => {
      if (first) {
        // Every pod lost: the first page is done, the rest stay queued.
        first = false
        run.requestedPerTry.push(queue.map(item => `${item.host}${item.pathname}`))
        onPage(queue.shift()!, counts(3))
        return 1
      }
      return warmPages(queue, tryNumber, onPage)
    }

    expect(await settle(warmBuild(run.options))).toBe(0)
    expect(run.lines.find(line => line.message === 'cache partly warmed, trying again')?.fields).toMatchObject({ unrequested: 2 })
    expect(run.requestedPerTry[1]).toEqual(['b.test/', 'a.test/products'])
  })
})

describe('withLocaleTwins', () => {
  const canonical = (...pathnames: string[]) => new Map(pathnames.map(pathname => [`a.test${pathname}`, { host: 'a.test', pathname }]))

  it('adds each page\'s twin in every other locale of its host, and none to a page already in one', () => {
    const pages = withLocaleTwins(canonical('/', '/products/1', '/en/about'), new Map([['a.test', ['/en']]]))

    expect([...pages.keys()].sort()).toEqual(['a.test/', 'a.test/en', 'a.test/en/about', 'a.test/en/products/1', 'a.test/products/1'])
    expect(pages.get('a.test/en/products/1')).toEqual({ host: 'a.test', pathname: '/en/products/1', locale: '/en' })
    expect(pages.get('a.test/products/1')?.locale).toBe('')
  })

  it('gives a page found before its host\'s prefixes were known its twins once they are', () => {
    const pages = canonical('/products/1')
    expect([...withLocaleTwins(pages, new Map()).keys()]).toEqual(['a.test/products/1'])
    expect([...withLocaleTwins(pages, new Map([['a.test', ['/en']]])).keys()]).toEqual(['a.test/products/1', 'a.test/en/products/1'])
  })
})

describe('sitemapReader', () => {
  const entry = (loc: string, alternates: string[] = []) =>
    `<url><loc>${loc}</loc>${alternates.map(href => `<xhtml:link rel="alternate" hreflang="x" href="${href}" />`).join('')}</url>`
  const index = `<sitemapindex><sitemap><loc>https://a.test/__sitemap__/pages.xml</loc></sitemap><sitemap><loc>https://a.test/__sitemap__/products.xml</loc></sitemap></sitemapindex>`
  const homeSitemap = `<urlset>${entry('https://a.test/', ['https://a.test/', 'https://a.test/en'])}</urlset>`
  const productSitemap = `<urlset>${entry('https://a.test/products/1')}</urlset>`

  it('keeps the locales a first read learnt for a product sitemap read again alone', async () => {
    // First read: the product sitemap answers 503. Second read: only it,
    // served now, without the home page entry the prefixes come from.
    const answers: Record<string, Array<{ status: number, body: string }>> = {
      '/sitemap.xml': [{ status: 200, body: index }],
      '/__sitemap__/pages.xml': [{ status: 200, body: homeSitemap }],
      '/__sitemap__/products.xml': [{ status: 503, body: '' }, { status: 200, body: productSitemap }],
    }
    const get = vi.fn(async (path: string) => answers[path]!.shift()!)
    const readSitemaps = sitemapReader({ get, log: () => {} })

    const first = await readSitemaps([{ host: 'a.test', path: '/sitemap.xml' }])
    expect(first.failed).toEqual([{ host: 'a.test', path: '/__sitemap__/products.xml' }])
    expect([...first.pages.keys()].sort()).toEqual(['a.test/', 'a.test/en'])

    const second = await readSitemaps(first.failed)
    expect(get).toHaveBeenCalledTimes(4)
    expect(second.failed).toEqual([])
    expect([...second.pages.keys()].sort()).toEqual(['a.test/', 'a.test/en', 'a.test/en/products/1', 'a.test/products/1'])
    expect(second.pages.get('a.test/en/products/1')).toEqual({ host: 'a.test', pathname: '/en/products/1', locale: '/en' })
  })

  it('reports a host that redirects, and a sitemap whose request failed', async () => {
    const get = vi.fn(async (_path: string, host: string) => {
      if (host === 'www.a.test') return { status: 301, body: '' }
      throw new Error('socket hang up')
    })
    const read = await sitemapReader({ get, log: () => {} })([{ host: 'www.a.test', path: '/sitemap.xml' }, { host: 'a.test', path: '/sitemap.xml' }])

    expect(read).toEqual({ pages: new Map(), failed: [{ host: 'a.test', path: '/sitemap.xml' }], redirectingHosts: ['www.a.test'] })
  })
})
