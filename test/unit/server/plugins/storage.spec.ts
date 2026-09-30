/**
 * `server/plugins/storage.ts`: the Nitro `cache` mount and its Redis
 * hygiene.
 *
 * Redis is the boundary: `redis` (the connection probe and the sweep
 * client) and `unstorage/drivers/redis` are replaced by fakes; the mount
 * itself is the real unstorage the Nitro shim provides.
 */
import type { Driver } from 'unstorage'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import plugin, {
  isSupersededBuildKey,
  redisReconnectDelay,
  sweepSupersededBuildCaches,
  withoutNonPositiveTtlWrites,
} from '~~/server/plugins/storage'
import { log, runNitroPlugin, setRuntimeConfig, useStorage } from '~~/test/helpers/nitro'

const redis = vi.hoisted(() => ({
  /** One fake node-redis client per `createClient` call, in call order. */
  clients: [] as Array<Record<string, any>>,
  /** How the next client behaves; each test sets it. */
  next: {} as { ping?: () => Promise<string>, lock?: string | null, keys?: string[] },
}))

vi.mock('redis', () => ({
  createClient: (options: unknown) => {
    const { ping, lock = 'OK', keys = [] } = redis.next
    const client = {
      options,
      on: vi.fn(),
      connect: vi.fn(async () => {}),
      ping: vi.fn(ping ?? (async () => 'PONG')),
      disconnect: vi.fn(async () => {}),
      set: vi.fn(async () => lock),
      scan: vi.fn(async () => ({ cursor: '0', keys })),
      unlink: vi.fn(async (doomed: string[]) => doomed.length),
    }
    redis.clients.push(client)
    return client
  },
}))

vi.mock('unstorage/drivers/redis', async () => {
  const { default: memoryDriver } = await import('unstorage/drivers/memory')
  return { default: (options: Record<string, unknown>) => ({ ...memoryDriver(), name: 'redis', options }) }
})

describe('redisReconnectDelay', () => {
  it('never gives up: every attempt gets a numeric delay', () => {
    for (const times of [1, 2, 3, 4, 10, 100, 10_000]) {
      expect(redisReconnectDelay(times)).toEqual(expect.any(Number))
    }
  })

  it('backs off linearly', () => {
    expect(redisReconnectDelay(1)).toBe(200)
    expect(redisReconnectDelay(3)).toBe(600)
  })

  it('caps the wait so a recovered Redis is picked up within seconds', () => {
    expect(redisReconnectDelay(10)).toBe(2000)
    expect(redisReconnectDelay(10_000)).toBe(2000)
  })
})

function makeDriver() {
  return {
    name: 'stub',
    getItem: vi.fn(async () => null),
    setItem: vi.fn(async () => {}),
    removeItem: vi.fn(async () => {}),
    getKeys: vi.fn(async () => []),
    clear: vi.fn(async () => {}),
  } as unknown as Driver & { setItem: ReturnType<typeof vi.fn>, getItem: ReturnType<typeof vi.fn>, removeItem: ReturnType<typeof vi.fn> }
}

describe('withoutNonPositiveTtlWrites', () => {
  let inner: ReturnType<typeof makeDriver>
  let wrapped: Driver

  beforeEach(() => {
    inner = makeDriver()
    wrapped = withoutNonPositiveTtlWrites(inner)
  })

  it.each([-1, 0, -3600])('skips the write when ttl is %s', async (ttl) => {
    await wrapped.setItem?.('cache:nitro:handlers:i18n:messages:el.json', 'x', { ttl } as never)
    expect(inner.setItem).not.toHaveBeenCalled()
  })

  it('forwards writes with a positive ttl', async () => {
    await wrapped.setItem?.('k', 'v', { ttl: 60 } as never)
    expect(inner.setItem).toHaveBeenCalledTimes(1)
  })

  it('forwards writes with no ttl at all', async () => {
    await wrapped.setItem?.('k', 'v', {} as never)
    expect(inner.setItem).toHaveBeenCalledTimes(1)
  })

  it('leaves reads and deletes untouched', async () => {
    await wrapped.getItem?.('k', {} as never)
    await wrapped.removeItem?.('k', {} as never)
    expect(inner.getItem).toHaveBeenCalledTimes(1)
    expect(inner.removeItem).toHaveBeenCalledTimes(1)
  })
})

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
    // Flushed whenever a full batch (500) is pending, then the rest.
    expect(client.unlinked.map(batch => batch.length)).toEqual([600, 100])
  })
})

const BUILD_ID = 'dffe3745-b63d-406b-908b-471f4c9a36be'
const PREVIOUS_BUILD_KEY = 'cache:1d5fca74-8566-4412-9372-aa7915033398:nitro:x.json'

/** The driver mounted at `cache` — `undefined` when nothing is (the root driver would answer). */
function cacheDriver() {
  const mount = useStorage().getMount('cache:x')
  return mount.base === 'cache:' ? mount.driver as Driver & { options?: Record<string, any> } : undefined
}

describe('the storage plugin', () => {
  beforeEach(() => {
    redis.clients.length = 0
    redis.next = {}
    setRuntimeConfig({ redis: { host: 'redis.test', port: 6379, ttl: 86400, db: 3 }, app: { buildId: BUILD_ID } })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('mounts a working memory cache and never probes Redis in memory mode', async () => {
    setRuntimeConfig({ cacheBase: 'memory' })

    await runNitroPlugin(plugin)
    await useStorage('cache').setItem('k', 'v')

    expect(cacheDriver()?.name).toBe('memory')
    expect(await useStorage('cache').getItem('k')).toBe('v')
    expect(redis.clients).toEqual([])
  })

  it('serves from memory while the Redis probe is still pending', async () => {
    setRuntimeConfig({ cacheBase: 'redis' })
    redis.next = { ping: () => new Promise<string>(() => {}) }

    await runNitroPlugin(plugin)

    expect(cacheDriver()?.name).toBe('memory')
    expect(redis.clients).toHaveLength(1)
  })

  it('swaps in Redis, namespaced by the build id, once the probe answers', async () => {
    setRuntimeConfig({ cacheBase: 'redis' })

    await runNitroPlugin(plugin)

    await vi.waitFor(() => expect(cacheDriver()?.name).toBe('redis'))
    expect(cacheDriver()?.options).toMatchObject({
      base: `cache:${BUILD_ID}`,
      host: 'redis.test',
      port: 6379,
      ttl: 86400,
      db: 3,
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      retryStrategy: redisReconnectDelay,
    })
  })

  it('reconnects only on the errors a failover produces', async () => {
    setRuntimeConfig({ cacheBase: 'redis' })
    await runNitroPlugin(plugin)
    await vi.waitFor(() => expect(cacheDriver()?.name).toBe('redis'))
    const { reconnectOnError } = cacheDriver()!.options!

    expect(reconnectOnError(new Error('READONLY You cannot write against a read only replica.'))).toBe(true)
    expect(reconnectOnError(new Error('read ECONNRESET'))).toBe(true)
    expect(reconnectOnError(new Error('WRONGTYPE Operation against a key'))).toBe(false)
  })

  it('keeps the build-less keyspace when the build has no id', async () => {
    setRuntimeConfig({ cacheBase: 'redis', app: { buildId: '' } })

    await runNitroPlugin(plugin)

    await vi.waitFor(() => expect(cacheDriver()?.options?.base).toBe('cache'))
  })

  it('keeps the memory driver and says so when Redis does not answer', async () => {
    setRuntimeConfig({ cacheBase: 'redis' })
    redis.next = {
      ping: async () => {
        throw new Error('ECONNREFUSED')
      },
    }

    await runNitroPlugin(plugin)

    await vi.waitFor(() => expect(log.warn).toHaveBeenCalledWith('cache', expect.stringContaining('Redis unavailable')))
    expect(cacheDriver()?.name).toBe('memory')
  })

  it('unmounts the cache on close so the Redis connection cannot hold the process open', async () => {
    setRuntimeConfig({ cacheBase: 'redis' })
    const nitroApp = await runNitroPlugin(plugin)
    await vi.waitFor(() => expect(cacheDriver()?.name).toBe('redis'))

    await nitroApp.hooks.callHook('close')

    expect(cacheDriver()).toBeUndefined()
  })

  describe('the post-deploy sweep', () => {
    async function bootAndWaitForSweep() {
      vi.useFakeTimers({ toFake: ['setTimeout'] })
      setRuntimeConfig({ cacheBase: 'redis' })
      await runNitroPlugin(plugin)
      await vi.waitFor(() => expect(cacheDriver()?.name).toBe('redis'))
      // The outgoing pods drain for a minute before their keys go.
      await vi.advanceTimersByTimeAsync(59_000)
      expect(redis.clients).toHaveLength(1)
      await vi.advanceTimersByTimeAsync(1_000)
      await vi.waitFor(() => expect(redis.clients[1]?.disconnect).toHaveBeenCalled())
      return redis.clients[1]!
    }

    it('elects one sweeper per build with a SET NX lock, then sweeps', async () => {
      redis.next = { keys: [PREVIOUS_BUILD_KEY, `cache:${BUILD_ID}:nitro:y.json`] }

      const sweeper = await bootAndWaitForSweep()

      expect(sweeper.set).toHaveBeenCalledWith(`cache:sweep:${BUILD_ID}`, '1', { NX: true, EX: 900 })
      expect(sweeper.unlink).toHaveBeenCalledWith([PREVIOUS_BUILD_KEY])
    })

    it('leaves the sweep to the replica that holds the lock', async () => {
      redis.next = { lock: null, keys: [PREVIOUS_BUILD_KEY] }

      const sweeper = await bootAndWaitForSweep()

      expect(sweeper.scan).not.toHaveBeenCalled()
      expect(sweeper.unlink).not.toHaveBeenCalled()
    })
  })
})
