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
import { cacheKeyBelongsToHost, tenantCacheKey } from '../../../../../../server/utils/cacheKey'

const TOKEN = 'purge-token-for-tests'
let suppliedToken: string | undefined
let requestBody: unknown

/**
 * `useStorage('cache')` with unstorage's `getKeys` semantics: the base
 * is normalised to `<base>:` and matched as a key PREFIX, which is why
 * `nitro:handlers:pageConfig` lists `pageConfig:*` but never
 * `pageConfigNavigation:*` (the Django surface file relies on that).
 */
function fakeStorage(seed: readonly string[]) {
  const keys = new Set(seed)
  return {
    keys,
    getKeys: vi.fn(async (base: string) => {
      const prefix = base.replace(/^:|:$/g, '') + ':'
      return [...keys].filter(key => key.startsWith(prefix))
    }),
    removeItem: vi.fn(async (key: string) => {
      keys.delete(key)
    }),
  }
}
let storage: ReturnType<typeof fakeStorage>

vi.stubGlobal('defineEventHandler', (fn: unknown) => fn)
vi.stubGlobal('useRuntimeConfig', () => ({ cachePurgeToken: TOKEN }))
vi.stubGlobal('getRequestHeader', (_event: unknown, name: string) =>
  name === 'x-cache-purge-token' ? suppliedToken : undefined)
vi.stubGlobal('getRequestIP', () => '10.42.0.1')
vi.stubGlobal('readValidatedBody', async (
  _event: unknown,
  parse: (v: unknown) => unknown,
) => parse(requestBody))
vi.stubGlobal('useStorage', () => storage)
vi.stubGlobal('createError', (init: Record<string, unknown>) => Object.assign(new Error(String(init.statusMessage)), init))
vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })
// The REAL matcher: the endpoint and the key producers must agree on
// where the host lives in a key, and that agreement is what this pins.
vi.stubGlobal('cacheKeyBelongsToHost', cacheKeyBelongsToHost)
const hostMock = vi.fn()
vi.stubGlobal('getRequestHost', hostMock)

const handler = (await import('../../../../../../server/api/admin/cache/purge.post')).default as (
  event: unknown,
) => Promise<{ matched: number, deleted: number, blocked: number, dryRun: boolean }>

/** A handler key exactly as Nitro stores a `tenantCacheKey` result. */
function handlerKey(name: string, host: string, inner: string): string {
  hostMock.mockReturnValueOnce(host)
  return `nitro:handlers:${name}:${tenantCacheKey({} as any, inner).replace(/\W/g, '')}.json`
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

async function purge(body: Record<string, unknown>) {
  requestBody = body
  return handler({})
}

describe('POST /api/admin/cache/purge', () => {
  let webside: string[]
  let demo: string[]

  beforeEach(() => {
    suppliedToken = TOKEN
    webside = WEBSIDE_KEYS()
    demo = DEMO_KEYS()
    storage = fakeStorage([...webside, ...demo, ...PLATFORM_KEYS])
  })

  it('rejects a wrong token before touching storage', async () => {
    suppliedToken = 'nope'
    await expect(purge({ patterns: ['cache:nitro:routes:_:*'] })).rejects.toMatchObject({ statusCode: 401 })
    expect(storage.getKeys).not.toHaveBeenCalled()
  })

  describe('scoped to one tenant host', () => {
    it('purges the store\'s handlers AND its rendered pages, nothing of another store', async () => {
      const result = await purge({ patterns: PAGE_CONFIG_PATTERNS, host: WEBSIDE })

      // 3 handler entries + 3 route renders (two homepage variants, /about).
      expect(result).toEqual({ matched: 6, deleted: 6, blocked: 0, dryRun: false })
      const remaining = [...storage.keys]
      expect(remaining).toEqual(expect.arrayContaining(demo))
      expect(remaining).toEqual(expect.arrayContaining(PLATFORM_KEYS))
      expect(remaining.filter(key => key.includes('host.L7PoZKHFRT'))).toEqual([])
      expect(remaining.filter(key => key.includes('websidegr__'))).toEqual([])
    })

    it('purges the store\'s sitemap feeds and leaves the other stores\' feeds', async () => {
      const result = await purge({ patterns: SITEMAP_PATTERNS, host: WEBSIDE })

      expect(result).toMatchObject({ matched: 2, deleted: 2 })
      const remaining = [...storage.keys]
      expect(remaining).toContain('nitro:functions:sitemap:products:demo.grooveshop.space:http:backend-service:80:api:v1:product')
      expect(remaining.filter(key => key.startsWith('nitro:functions:sitemap:') && key.includes(':webside.gr:'))).toEqual([])
    })

    it('never claims platform-wide entries for a tenant', async () => {
      const result = await purge({ patterns: ['cache:nitro:functions:i18n*', 'cache:nitro:handlers:health*'], host: WEBSIDE })

      expect(result).toMatchObject({ matched: 0, deleted: 0 })
      expect([...storage.keys]).toEqual(expect.arrayContaining(PLATFORM_KEYS))
    })

    it('dry run counts the same keys and deletes none', async () => {
      const result = await purge({ patterns: PAGE_CONFIG_PATTERNS, host: WEBSIDE, dryRun: true })

      expect(result).toEqual({ matched: 6, deleted: 0, blocked: 0, dryRun: true })
      expect(storage.removeItem).not.toHaveBeenCalled()
    })
  })

  describe('without a host (platform-wide)', () => {
    it('purges every tenant\'s matching keys', async () => {
      const result = await purge({ patterns: PAGE_CONFIG_PATTERNS })

      // webside 6 + demo 3 (handlers ×2, homepage) — demo's /products
      // render is outside the surface's route list.
      expect(result).toMatchObject({ matched: 9, deleted: 9 })
      expect([...storage.keys]).toEqual(expect.arrayContaining(PLATFORM_KEYS))
    })
  })

  it('lets a later pattern claim a key an earlier same-prefix pattern rejected', async () => {
    // Every `_nuxt_routes()` pattern lists the whole `nitro:routes:_:`
    // family and post-filters by regex. Marking a key as visited before
    // the regex ran meant `*index*` swallowed `/about`, `/contact`, … and
    // only the first route of a surface was ever purged.
    const result = await purge({
      patterns: ['cache:nitro:routes:_:*index*', 'cache:nitro:routes:_:*about*'],
      host: WEBSIDE,
    })

    expect(result).toMatchObject({ matched: 3 })
    expect([...storage.keys].some(key => key.includes(':about.'))).toBe(false)
  })

  it('respects unstorage segment boundaries for a trailing-star pattern', async () => {
    // `pageConfig*` lists the `pageConfig:` segment only; the navigation
    // handler is a sibling segment and needs its own pattern.
    const result = await purge({ patterns: ['cache:nitro:handlers:pageConfig*'], host: WEBSIDE })

    expect(result).toMatchObject({ matched: 1 })
    expect([...storage.keys].some(key => key.startsWith('nitro:handlers:pageConfigNavigation:'))).toBe(true)
  })
})
