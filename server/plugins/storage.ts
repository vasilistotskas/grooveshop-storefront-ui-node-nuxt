import { createClient } from 'redis'
import redisDriver from 'unstorage/drivers/redis'
import memoryDriver from 'unstorage/drivers/memory'
import type { Driver } from 'unstorage'

/**
 * Nitro Cache Storage Plugin
 *
 * Configures the 'cache' storage mount point used by:
 * - defineCachedEventHandler (default base: 'cache')
 * - defineCachedFunction (default base: 'cache')
 * - Route rules with cache option
 *
 * @see https://nitro.build/guide/cache#customize-cache-storage
 *
 * Configuration:
 * - NUXT_CACHE_BASE='redis' → Use Redis driver
 * - NUXT_CACHE_BASE='memory' → Use memory driver (default)
 */

const CACHE_MOUNT_POINT = 'cache' // Nitro's default, do not change

interface RedisDriverOptions {
  host: string
  port: number
  ttl: number
  /**
   * Redis key prefix. Carries the BUILD ID, so a deploy cannot read
   * the previous build's entries — see `cacheNamespace`.
   */
  base: string
  db?: number
  password?: string
}

/**
 * The Redis key prefix for this build's cache entries.
 *
 * A cached SSR render embeds the asset URLs of the build that produced
 * it (`/_nuxt/entry.<hash>.css`), and those files do not exist in the
 * next image. With one fixed prefix, a deploy inherited the previous
 * build's HTML and served pages that referenced 404s — no CSS, no JS,
 * and at 390px no layout either — for as long as the entry lived. The
 * prerendered routes carry `s-maxage=3600`, so that was up to an hour
 * of unstyled pages after every deploy, on the pages least likely to
 * be noticed. Found by `pnpm audit:visual` on 2026-09-07, on
 * /privacy-policy, /terms-of-use, /cookies-policy, /return-policy and
 * /contact at once.
 *
 * Namespacing by build id makes it structurally impossible: the new
 * build reads and writes its own keyspace and the old entries expire
 * unread on their existing TTL. No purge step to remember, and no
 * window where a stale entry can win.
 */
function cacheNamespace(buildId: string | undefined): string {
  // `app.buildId` is a per-build uuid in Nuxt; the fallback keeps the
  // prefix stable (and the old behaviour) if it is ever absent.
  return buildId ? `${CACHE_MOUNT_POINT}:${buildId}` : CACHE_MOUNT_POINT
}

/** The shape of `app.buildId` — a uuid, one per build. */
const BUILD_ID_PATTERN
  = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** How many keys to ask Redis for, and to UNLINK, at a time. */
const SWEEP_BATCH = 500

/**
 * Wait before sweeping so the previous build's pods can drain.
 *
 * A rolling deploy runs both builds at once, and the outgoing pods are
 * still reading their own namespace. Deleting it the instant the new
 * pod boots would make them re-render every request they have left —
 * correct, but a pointless CPU spike on pods that are about to exit.
 */
const SWEEP_DELAY_MS = 60_000

/**
 * True when `key` belongs to a build namespace that is not `buildId`.
 *
 * Deliberately narrow. Keys are `cache:<buildId>:nitro:...`, but the
 * same mount also holds `cache:nitro:...` (the fallback namespace used
 * when `app.buildId` is absent) and the sweep's own lock. Requiring the
 * second segment to be uuid-shaped means a prefix match can never take
 * out either, nor the current build.
 */
export function isSupersededBuildKey(key: string, buildId: string): boolean {
  const [mount, namespace] = key.split(':')
  if (mount !== CACHE_MOUNT_POINT || !namespace) {
    return false
  }
  if (!BUILD_ID_PATTERN.test(namespace)) {
    return false
  }
  return namespace !== buildId
}

/** The minimum Redis surface the sweep needs, so tests can fake it. */
interface SweepClient {
  scan: (
    cursor: string,
    opts: { MATCH: string, COUNT: number },
  ) => Promise<{ cursor: string | number, keys: string[] }>
  unlink: (keys: string[]) => Promise<number>
}

/**
 * Delete the cache namespaces of superseded builds.
 *
 * Namespacing by build id (see `cacheNamespace`) means a deploy cannot
 * read the previous build's entries — but it does not delete them, so
 * every release strands a full build's worth of SSR renders for the
 * whole `NUXT_REDIS_TTL` (24h). Measured on production 2026-09-09,
 * minutes after a deploy: 1241 orphaned keys, ~352 MB, against a Redis
 * `maxmemory` of 614 MB. More than half the budget was cache no
 * process could reach.
 *
 * `allkeys-lru` does evict them under memory pressure, so this was
 * never going to OOM. The cost is on disk: the orphans inflate the
 * dataset that AOF and RDB write out, and a full volume is what took
 * the store down that morning.
 *
 * SCAN, never KEYS — this runs against the live cache of a serving
 * store. Returns the number of keys removed.
 */
export async function sweepSupersededBuildCaches(
  client: SweepClient,
  buildId: string,
): Promise<number> {
  let cursor = '0'
  let removed = 0
  let doomed: string[] = []

  do {
    const page = await client.scan(cursor, {
      MATCH: `${CACHE_MOUNT_POINT}:*`,
      COUNT: SWEEP_BATCH,
    })
    cursor = String(page.cursor)

    for (const key of page.keys) {
      if (isSupersededBuildKey(key, buildId)) {
        doomed.push(key)
      }
    }

    if (doomed.length >= SWEEP_BATCH) {
      removed += await client.unlink(doomed)
      doomed = []
    }
  } while (cursor !== '0')

  if (doomed.length) {
    removed += await client.unlink(doomed)
  }

  return removed
}

/**
 * Drops cache writes whose TTL is non-positive instead of forwarding them.
 *
 * Nitro derives the storage TTL from a cached handler's `maxAge`, and a
 * handler can legitimately be registered with a non-positive one to mean
 * "do not cache this". Redis has no such concept: `SET … EX -1` is
 * rejected outright with `ERR invalid expire time in 'set' command`.
 *
 * @nuxtjs/i18n 10.6.0 does exactly that — `dist/runtime/server/routes/
 * messages.js` registers its messages handler with
 * `maxAge: !__I18N_CACHE__ ? -1 : …`, so disabling message caching (which
 * this project does deliberately, see `i18n.experimental.cacheLifetime`
 * in nuxt.config.ts) made every SSR message load attempt an invalid write.
 * Observed in production 2026-08-21: a failed Redis round-trip plus a
 * logged `[cache] Cache write error` on each request.
 *
 * Skipping the write — rather than storing the entry with no expiry —
 * is what the caller actually asked for: the next read misses and the
 * handler re-runs. Only writes are filtered; reads and deletes pass
 * through untouched.
 */
export function withoutNonPositiveTtlWrites(driver: Driver): Driver {
  const setItem = driver.setItem?.bind(driver)
  if (!setItem) {
    return driver
  }
  return {
    ...driver,
    setItem(key, value, opts) {
      const ttl = (opts as { ttl?: number } | undefined)?.ttl
      if (typeof ttl === 'number' && ttl <= 0) {
        return
      }
      return setItem(key, value, opts)
    },
  }
}

/**
 * Creates a Redis driver with ioredis configuration optimized for graceful error handling.
 * The unstorage redis driver uses ioredis internally.
 */
function createRedisDriver({ host, port, ttl, base, db, password }: RedisDriverOptions): Driver {
  return withoutNonPositiveTtlWrites(redisDriver({
    base,
    host,
    port,
    ttl,
    ...(db !== undefined && { db }),
    ...(password && { password }),
    // ioredis options for graceful error handling
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        log.warn('cache', 'ioredis: Max retries reached, giving up')
        return null
      }
      return Math.min(times * 200, 2000)
    },
    reconnectOnError: (err: Error) => {
      const recoverableErrors = ['READONLY', 'ECONNRESET']
      return recoverableErrors.some(e => err.message.includes(e))
    },
  }))
}

/**
 * Tests Redis connectivity using node-redis client.
 * Returns true if connection successful, false otherwise.
 */
async function testRedisConnection(host: string, port: number, db?: number, password?: string): Promise<boolean> {
  const client = createClient({
    socket: {
      host,
      port,
      connectTimeout: 5000,
      reconnectStrategy: (retries) => {
        if (retries > 3) return false
        return Math.min(retries * 100, 3000)
      },
    },
    ...(db !== undefined && { database: db }),
    ...(password && { password }),
  })

  client.on('error', () => {}) // Suppress error logs during test

  try {
    await client.connect()
    const pong = await client.ping()
    return pong === 'PONG'
  }
  catch {
    return false
  }
  finally {
    try {
      await client.disconnect()
    }
    catch { /* ignore disconnect errors */ }
  }
}

/**
 * Run the sweep once per deploy, in the background, on one pod.
 *
 * Never awaited and never able to throw into startup: an unreachable
 * Redis or a failed SCAN must not stop a pod serving pages. The whole
 * point is reclaiming space, which can always wait for the next boot.
 *
 * The `SET NX` lock keys on the build id, so the replicas of one
 * deploy elect a single sweeper while a later deploy still gets its
 * own turn. Its own key is not uuid-shaped, so the sweep cannot
 * delete the lock out from under itself.
 */
function scheduleBuildCacheSweep(opts: {
  buildId: string | undefined
  host: string
  port: number
  db: number
  password: string | undefined
}): void {
  const { buildId, host, port, db, password } = opts

  // Without a build id there is no current namespace to protect, so
  // there is no safe way to tell this build's keys from a dead one's.
  if (!buildId) {
    return
  }

  const timer = setTimeout(() => {
    void (async () => {
      const client = createClient({
        socket: { host, port, connectTimeout: 5000, reconnectStrategy: false },
        database: db,
        ...(password && { password }),
      })
      client.on('error', () => {})

      try {
        await client.connect()

        const lock = await client.set(
          `${CACHE_MOUNT_POINT}:sweep:${buildId}`,
          '1',
          { NX: true, EX: 900 },
        )
        if (lock !== 'OK') {
          return
        }

        const removed = await sweepSupersededBuildCaches(
          client as unknown as SweepClient,
          buildId,
        )
        if (removed > 0) {
          log.info('cache', `Swept ${removed} key(s) from superseded build namespaces`)
        }
      }
      catch (error) {
        log.warn('cache', `Build cache sweep skipped: ${(error as Error).message}`)
      }
      finally {
        try {
          await client.disconnect()
        }
        catch { /* ignore disconnect errors */ }
      }
    })()
  }, SWEEP_DELAY_MS)

  // Do not hold the event loop open on shutdown just to wait for this.
  timer.unref?.()
}

export default defineNitroPlugin(async (nitroApp) => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  const { host, port, ttl, db, password } = config.redis
  const redisHost = host as string
  const redisPort = Number(port)
  const redisTTL = Number(ttl)
  const redisDB = Number(db ?? 3)
  const redisPassword = password as string | undefined
  const useRedis = config.cacheBase === 'redis'

  // Unmount Nitro's default cache driver (filesystem in dev, memory in prod)
  // This is required because Nitro auto-mounts before plugins run
  await storage.unmount(CACHE_MOUNT_POINT).catch(() => {})

  // Mount memory immediately so the pod can serve (and pass its first
  // readiness render) without waiting on the Redis probe below. Nitro
  // awaits plugin init before handling any request, so awaiting the
  // ~5s connectTimeout here delayed every scale-up pod's readiness —
  // the prod audit (2026-07-02) caught fresh replicas failing startup
  // probes with "context deadline exceeded" during HPA churn.
  storage.mount(CACHE_MOUNT_POINT, memoryDriver())

  if (!useRedis) {
    log.info('cache', `Using memory driver (NUXT_CACHE_BASE=${config.cacheBase})`)
    return
  }

  // Unmount the cache driver on shutdown so ioredis connections are closed and
  // the process can exit cleanly after prerender (or normal server shutdown).
  nitroApp.hooks.hookOnce('close', async () => {
    await storage.unmount(CACHE_MOUNT_POINT).catch(() => {})
  })

  log.info('cache', `Testing Redis connection at ${redisHost}:${redisPort} (db: ${redisDB})...`)

  // Deliberately NOT awaited: the probe runs in the background and
  // swaps Redis in when it succeeds. Cache entries written to memory
  // during that window are simply lost on swap — an acceptable cost;
  // Nitro's cached handlers already tolerate cache-layer errors.
  void testRedisConnection(redisHost, redisPort, redisDB, redisPassword).then(async (isConnected) => {
    if (isConnected) {
      const base = cacheNamespace(config.app?.buildId)
      const driver = createRedisDriver({ host: redisHost, port: redisPort, ttl: redisTTL, base, db: redisDB, password: redisPassword })
      await storage.unmount(CACHE_MOUNT_POINT).catch(() => {})
      storage.mount(CACHE_MOUNT_POINT, driver)
      log.info('cache', `Redis driver mounted at '${CACHE_MOUNT_POINT}' (${redisHost}:${redisPort} db=${redisDB}, TTL: ${redisTTL}s, keyspace: ${base})`)

      scheduleBuildCacheSweep({
        buildId: config.app?.buildId,
        host: redisHost,
        port: redisPort,
        db: redisDB,
        password: redisPassword,
      })
    }
    else {
      log.warn('cache', `Redis unavailable, keeping memory driver (not shared across pods!)`)
    }
  })
})
