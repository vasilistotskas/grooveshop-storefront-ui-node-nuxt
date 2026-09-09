/**
 * Namespacing the cache by build id stops a deploy reading the previous
 * build's SSR renders, but nothing deletes them — so every release
 * strands a full build's worth of entries for the whole
 * `NUXT_REDIS_TTL` (24h).
 *
 * Measured on production 2026-09-09, minutes after a deploy: 1241
 * orphaned keys, ~352 MB, against a Redis `maxmemory` of 614 MB. More
 * than half the budget was cache no process could reach, inflating the
 * dataset AOF and RDB write to the volume that had filled that morning.
 *
 * The dangerous half of the sweep is deciding what NOT to delete, so
 * that is what most of these pin.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.stubGlobal('defineNitroPlugin', (fn: unknown) => fn)
vi.stubGlobal('useStorage', () => ({ mount: vi.fn(), unmount: vi.fn(async () => {}) }))
vi.stubGlobal('useRuntimeConfig', () => ({ redis: {}, cacheBase: 'memory' }))
vi.stubGlobal('log', { info: vi.fn(), warn: vi.fn(), error: vi.fn() })

const { isSupersededBuildKey, sweepSupersededBuildCaches } = await import(
  '../../../../server/plugins/storage'
)

const CURRENT = 'dffe3745-b63d-406b-908b-471f4c9a36be'
const PREVIOUS = '1d5fca74-8566-4412-9372-aa7915033398'

describe('isSupersededBuildKey', () => {
  it('claims a key from an older build namespace', () => {
    expect(
      isSupersededBuildKey(`cache:${PREVIOUS}:nitro:routes:_:index.json`, CURRENT),
    ).toBe(true)
  })

  it('spares the current build', () => {
    expect(
      isSupersededBuildKey(`cache:${CURRENT}:nitro:routes:_:index.json`, CURRENT),
    ).toBe(false)
  })

  it('spares the build-less fallback namespace', () => {
    // `cacheNamespace` falls back to a bare `cache` when app.buildId is
    // absent. A prefix match on `cache:` would delete live entries.
    expect(isSupersededBuildKey('cache:nitro:routes:_:index.json', CURRENT))
      .toBe(false)
    expect(isSupersededBuildKey('cache:nitro:functions:getX:default.json', CURRENT))
      .toBe(false)
  })

  it('spares the sweep lock', () => {
    expect(isSupersededBuildKey(`cache:sweep:${PREVIOUS}`, CURRENT)).toBe(false)
  })

  it('ignores keys outside the cache mount', () => {
    // db3 is Nuxt-only today, but nothing enforces that forever.
    expect(isSupersededBuildKey(`session:${PREVIOUS}:x`, CURRENT)).toBe(false)
    expect(isSupersededBuildKey('image:webside:abc', CURRENT)).toBe(false)
    expect(isSupersededBuildKey('celery-task-meta-abc', CURRENT)).toBe(false)
  })

  it('ignores a second segment that is not uuid-shaped', () => {
    expect(isSupersededBuildKey('cache:v3.186.1:nitro:routes', CURRENT)).toBe(false)
    expect(isSupersededBuildKey('cache::nitro:routes', CURRENT)).toBe(false)
  })
})

function fakeClient(pages: Array<{ cursor: string, keys: string[] }>) {
  const unlinked: string[][] = []
  let call = 0
  return {
    unlinked,
    scans: () => call,
    scan: vi.fn(async () => pages[call++] ?? { cursor: '0', keys: [] }),
    unlink: vi.fn(async (keys: string[]) => {
      unlinked.push(keys)
      return keys.length
    }),
  }
}

describe('sweepSupersededBuildCaches', () => {
  let client: ReturnType<typeof fakeClient>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('removes only the superseded keys it finds', async () => {
    client = fakeClient([
      {
        cursor: '0',
        keys: [
          `cache:${PREVIOUS}:nitro:routes:_:index.json`,
          `cache:${CURRENT}:nitro:routes:_:index.json`,
          'cache:nitro:handlers:x.json',
          `cache:sweep:${CURRENT}`,
        ],
      },
    ])

    const removed = await sweepSupersededBuildCaches(client, CURRENT)

    expect(removed).toBe(1)
    expect(client.unlinked.flat()).toEqual([
      `cache:${PREVIOUS}:nitro:routes:_:index.json`,
    ])
  })

  it('follows the cursor to the end', async () => {
    client = fakeClient([
      { cursor: '17', keys: [`cache:${PREVIOUS}:a`] },
      { cursor: '42', keys: [`cache:${CURRENT}:b`] },
      { cursor: '0', keys: [`cache:${PREVIOUS}:c`] },
    ])

    const removed = await sweepSupersededBuildCaches(client, CURRENT)

    expect(client.scans()).toBe(3)
    expect(removed).toBe(2)
  })

  it('tolerates a numeric cursor', async () => {
    // node-redis has shipped both a string and a number here.
    client = {
      ...fakeClient([]),
      scan: vi.fn(async () => ({ cursor: 0, keys: [`cache:${PREVIOUS}:a`] })),
    } as never

    await expect(sweepSupersededBuildCaches(client, CURRENT)).resolves.toBe(1)
  })

  it('scans rather than listing every key', async () => {
    // KEYS blocks the server; this runs against a live store's cache.
    client = fakeClient([{ cursor: '0', keys: [] }])

    await sweepSupersededBuildCaches(client, CURRENT)

    expect(client.scan).toHaveBeenCalledWith('0', {
      MATCH: 'cache:*',
      COUNT: expect.any(Number),
    })
  })

  it('does not call unlink when nothing is superseded', async () => {
    client = fakeClient([
      { cursor: '0', keys: [`cache:${CURRENT}:nitro:routes:_:index.json`] },
    ])

    const removed = await sweepSupersededBuildCaches(client, CURRENT)

    expect(removed).toBe(0)
    expect(client.unlink).not.toHaveBeenCalled()
  })

  it('unlinks in batches instead of one giant call', async () => {
    // The real orphan set was 1241 keys; a single UNLINK of everything
    // is one long block on a shared Redis.
    const many = Array.from(
      { length: 700 },
      (_, i) => `cache:${PREVIOUS}:nitro:routes:_:p${i}.json`,
    )
    client = fakeClient([
      { cursor: '1', keys: many.slice(0, 600) },
      { cursor: '0', keys: many.slice(600) },
    ])

    const removed = await sweepSupersededBuildCaches(client, CURRENT)

    expect(removed).toBe(700)
    expect(client.unlink.mock.calls.length).toBeGreaterThan(1)
    expect(client.unlinked.flat()).toHaveLength(700)
  })
})
