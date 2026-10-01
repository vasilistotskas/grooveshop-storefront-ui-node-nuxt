/**
 * The purge endpoint against the real production key shapes.
 *
 * Django scopes every merchant purge to the store's host. Until
 * 2026-09-18 the endpoint recognised the host in only one of Nitro's
 * three key shapes, so a tenant purge of the `page_config` surface
 * cleared the handler JSON but left every rendered page, and a
 * `sitemap_seo` purge matched nothing at all — each reporting success.
 * These seed a storage with keys copied from the live keyspace (minus
 * the `cache:<buildId>:` mount prefix the storage hides) and pin what a
 * scoped purge must and must not touch.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import handler from '~~/server/api/admin/cache/purge.post'
import { tenantCacheKey } from '~~/server/utils/cacheKey'
import { callRoute, createTestEvent, log, setRuntimeConfig, useStorage } from '~~/test/helpers/nitro'

const TOKEN = 'purge-token-for-tests'
const route = '/api/admin/cache/purge'

/** A handler key exactly as Nitro stores a `tenantCacheKey` result. */
function handlerKey(name: string, host: string, inner: string): string {
  return `nitro:handlers:${name}:${tenantCacheKey(createTestEvent({ host }), inner).replace(/\W/g, '')}.json`
}

const WEBSIDE = 'webside.gr'
const DEMO = 'demo.grooveshop.space'

// Route and function keys verbatim from production (2026-09-18); the
// `host.<hash>` tokens are Nitro's vary hashes of each tenant host.
const WEBSIDE_KEYS = () => [
  handlerKey('pageConfig', WEBSIDE, 'page-config:products:el'),
  handlerKey('pageConfigNavigation', WEBSIDE, 'page-config:navigation:el'),
  handlerKey('ContentPageDetailViewSet', WEBSIDE, 'content-page:privacy'),
  'nitro:routes:_:index.il7asoJjJE:host.L7PoZKHFRT:xdeviceclass.aGk9AqtPuy.json',
  'nitro:routes:_:index.Bbx5eOpPsy:host.L7PoZKHFRT:xdeviceclass.aGk9AqtPuy.json',
  'nitro:routes:_:about.l5vdxKjKr9:host.L7PoZKHFRT:xdeviceclass.aGk9AqtPuy.json',
  'nitro:functions:sitemap:products:webside.gr:http:backend-service:80:api:v1:product',
  'nitro:functions:sitemap:blog-posts:webside.gr:http:backend-service:80:api:v1:blog:post',
]
const DEMO_KEYS = () => [
  handlerKey('pageConfig', DEMO, 'page-config:products:el'),
  handlerKey('ContentPageDetailViewSet', DEMO, 'content-page:terms'),
  'nitro:routes:_:index.il7asoJjJE:host.uGk9nD1HSf:xdeviceclass.aGk9AqtPuy.json',
  'nitro:routes:_:products20demosc.EnOHlnel5C:host.uGk9nD1HSf:xdeviceclass.aGk9AqtPuy.json',
  'nitro:functions:sitemap:products:demo.grooveshop.space:http:backend-service:80:api:v1:product',
]
const PLATFORM_KEYS = [
  'nitro:functions:i18n:messages-internal:el-054c0cf1.json',
  'nitro:handlers:health:default.json',
]

// The `page_config` and `sitemap_seo` surfaces as Django sends them
// (`core/cache/surfaces.py`).
const PAGE_CONFIG_PATTERNS = [
  'cache:nitro:handlers:pageConfig*',
  'cache:nitro:handlers:pageConfigNavigation*',
  'cache:nitro:handlers:ContentPageViewSet*',
  'cache:nitro:handlers:ContentPageDetailViewSet*',
  'cache:nitro:routes:_:*index*',
  'cache:nitro:routes:_:*about*',
]
const SITEMAP_PATTERNS = [
  'cache:nitro:functions:sitemap*',
  'cache:nitro:functions:rss*',
  'cache:nitro:functions:RssFeed*',
  'cache:nitro:handlers:nuxt-ai-ready*',
]

async function purge(body: Record<string, unknown>, token: string | undefined = TOKEN) {
  return callRoute(handler, {
    route,
    method: 'POST',
    body,
    headers: token === undefined ? {} : { 'x-cache-purge-token': token },
  })
}

function remainingKeys() {
  return useStorage('cache').getKeys()
}

describe('POST /api/admin/cache/purge', () => {
  let webside: string[]
  let demo: string[]
  let total: number

  beforeEach(async () => {
    setRuntimeConfig({ cachePurgeToken: TOKEN })
    webside = WEBSIDE_KEYS()
    demo = DEMO_KEYS()
    const seed = [...webside, ...demo, ...PLATFORM_KEYS]
    total = seed.length
    const cache = useStorage('cache')
    for (const key of seed) await cache.setItem(key, { value: 1 })
  })

  it('rejects a wrong token before touching storage', async () => {
    const getKeys = vi.spyOn(useStorage(), 'getKeys')

    const response = await purge({ patterns: ['cache:nitro:routes:_:*'] }, 'nope')

    expect(response.status).toBe(401)
    expect(getKeys).not.toHaveBeenCalled()
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ message: 'Rejected: invalid token' }))
  })

  it.each([
    ['an empty header', ''],
    ['no header', undefined],
    ['any header', 'anything'],
  ])('rejects every caller while no token is configured (%s)', async (_label, token) => {
    // An unset secret must never mean "no auth": '' === '' would pass a
    // naive compare.
    setRuntimeConfig({ cachePurgeToken: '' })

    const response = await purge({ patterns: ['cache:nitro:routes:_:*'] }, token)

    expect(response.status).toBe(401)
    expect(await remainingKeys()).toHaveLength(total)
  })

  it.each([
    ['no patterns', { patterns: [] }],
    ['more than 64 patterns', { patterns: Array.from({ length: 65 }, (_, i) => `cache:nitro:handlers:x${i}*`) }],
    ['an empty pattern', { patterns: [''] }],
  ])('rejects a body with %s', async (_label, body) => {
    const response = await purge(body)

    expect(response.status).toBe(400)
    expect(await remainingKeys()).toHaveLength(total)
  })

  describe('scoped to one tenant host', () => {
    it('purges the store handlers AND its rendered pages, nothing of another store', async () => {
      const response = await purge({ patterns: PAGE_CONFIG_PATTERNS, host: WEBSIDE })

      // 3 handler entries + 3 route renders (two homepage variants, /about).
      expect(response.body).toEqual({ matched: 6, deleted: 6, blocked: 0, dryRun: false })
      const remaining = await remainingKeys()
      expect(remaining).toEqual(expect.arrayContaining(demo))
      expect(remaining).toEqual(expect.arrayContaining(PLATFORM_KEYS))
      expect(remaining.filter(key => key.includes('host.L7PoZKHFRT'))).toEqual([])
      expect(remaining.filter(key => key.includes('websidegr__'))).toEqual([])
    })

    it('names the store as its keys do, whatever case the host is sent in', async () => {
      const response = await purge({ patterns: PAGE_CONFIG_PATTERNS, host: WEBSIDE.toUpperCase() })

      expect(response.body).toEqual({ matched: 6, deleted: 6, blocked: 0, dryRun: false })
    })

    it('purges the store sitemap feeds and leaves the other stores feeds', async () => {
      const response = await purge({ patterns: SITEMAP_PATTERNS, host: WEBSIDE })

      expect(response.body).toMatchObject({ matched: 2, deleted: 2 })
      const remaining = await remainingKeys()
      expect(remaining).toContain('nitro:functions:sitemap:products:demo.grooveshop.space:http:backend-service:80:api:v1:product')
      expect(remaining.filter(key => key.startsWith('nitro:functions:sitemap:') && key.includes(':webside.gr:'))).toEqual([])
    })

    it('never claims platform-wide entries for a tenant', async () => {
      const response = await purge({ patterns: ['cache:nitro:functions:i18n*', 'cache:nitro:handlers:health*'], host: WEBSIDE })

      expect(response.body).toMatchObject({ matched: 0, deleted: 0 })
      expect(await remainingKeys()).toEqual(expect.arrayContaining(PLATFORM_KEYS))
    })

    it('dry run counts the same keys and deletes none', async () => {
      const response = await purge({ patterns: PAGE_CONFIG_PATTERNS, host: WEBSIDE, dryRun: true })

      expect(response.body).toEqual({ matched: 6, deleted: 0, blocked: 0, dryRun: true })
      expect(await remainingKeys()).toHaveLength(total)
    })
  })

  describe('without a host (platform-wide)', () => {
    it('purges every tenant matching keys', async () => {
      const response = await purge({ patterns: PAGE_CONFIG_PATTERNS })

      // webside 6 + demo 3 (handlers x2, homepage) — the demo /products
      // render is outside the surface's route list.
      expect(response.body).toMatchObject({ matched: 9, deleted: 9 })
      expect(await remainingKeys()).toEqual(expect.arrayContaining(PLATFORM_KEYS))
    })
  })

  it('counts and keeps keys holding a protected fragment', async () => {
    const cache = useStorage('cache')
    await cache.setItem('nitro:handlers:session:abc.json', { value: 1 })
    await cache.setItem('nitro:handlers:throttle:abc.json', { value: 1 })

    const response = await purge({ patterns: ['cache:nitro:handlers:*'] })

    // The seeded health probe entry is a protected key too.
    expect(response.body.blocked).toBe(3)
    expect(await remainingKeys()).toEqual(expect.arrayContaining([
      'nitro:handlers:session:abc.json',
      'nitro:handlers:throttle:abc.json',
      'nitro:handlers:health:default.json',
    ]))
  })

  it('matches a mid-pattern glob against the whole key', async () => {
    const response = await purge({ patterns: ['cache:nitro:routes:_:*about*'] })

    expect(response.body).toMatchObject({ matched: 1, deleted: 1 })
    const remaining = await remainingKeys()
    expect(remaining.some(key => key.includes(':about.'))).toBe(false)
    expect(remaining.some(key => key.includes(':index.'))).toBe(true)
  })

  it('skips a pattern whose key listing fails and carries on with the next', async () => {
    const root = useStorage()
    const getKeys = root.getKeys.bind(root)
    vi.spyOn(root, 'getKeys').mockImplementation(async (base, ...rest) => {
      if (String(base).includes('pageConfig')) throw new Error('redis down')
      return getKeys(base, ...rest)
    })

    const response = await purge({ patterns: ['cache:nitro:handlers:pageConfig*', 'cache:nitro:routes:_:*about*'] })

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ matched: 1, deleted: 1 })
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ message: 'getKeys failed', error: 'redis down' }))
  })

  it('counts a key it failed to remove as matched but not deleted', async () => {
    vi.spyOn(useStorage(), 'removeItem').mockRejectedValueOnce(new Error('redis down'))

    const response = await purge({ patterns: ['cache:nitro:routes:_:*about*'] })

    expect(response.body).toMatchObject({ matched: 1, deleted: 0 })
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ message: 'removeItem failed' }))
  })

  it('counts a key once when two patterns both claim it', async () => {
    const response = await purge({
      patterns: ['cache:nitro:routes:_:*about*', 'cache:nitro:routes:_:*about*'],
      dryRun: true,
    })

    expect(response.body).toMatchObject({ matched: 1, deleted: 0 })
  })

  it('lets a later pattern claim a key an earlier same-prefix pattern rejected', async () => {
    // Every `_nuxt_routes()` pattern lists the whole `nitro:routes:_:`
    // family and post-filters by regex. Marking a key as visited before
    // the regex ran meant `*index*` swallowed `/about`, `/contact`, … and
    // only the first route of a surface was ever purged.
    const response = await purge({
      patterns: ['cache:nitro:routes:_:*index*', 'cache:nitro:routes:_:*about*'],
      host: WEBSIDE,
    })

    expect(response.body).toMatchObject({ matched: 3 })
    expect((await remainingKeys()).some(key => key.includes(':about.'))).toBe(false)
  })

  it('respects unstorage segment boundaries for a trailing-star pattern', async () => {
    // `pageConfig*` lists the `pageConfig:` segment only; the navigation
    // handler is a sibling segment and needs its own pattern.
    const response = await purge({ patterns: ['cache:nitro:handlers:pageConfig*'], host: WEBSIDE })

    expect(response.body).toMatchObject({ matched: 1 })
    expect((await remainingKeys()).some(key => key.startsWith('nitro:handlers:pageConfigNavigation:'))).toBe(true)
  })
})
