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
  password?: string
}

/**
 * Creates a Redis driver with ioredis configuration optimized for graceful error handling.
 * The unstorage redis driver uses ioredis internally.
 */
function createRedisDriver({ host, port, ttl, password }: RedisDriverOptions): Driver {
  return redisDriver({
    base: CACHE_MOUNT_POINT,
    host,
    port,
    ttl,
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
  })
}

/**
 * Tests Redis connectivity using node-redis client.
 * Returns true if connection successful, false otherwise.
 */
async function testRedisConnection(host: string, port: number, password?: string): Promise<boolean> {
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

export default defineNitroPlugin(async (nitroApp) => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  const { host, port, ttl, password } = config.redis
  const redisHost = host as string
  const redisPort = Number(port)
  const redisTTL = Number(ttl)
  const redisPassword = password as string | undefined
  const useRedis = config.cacheBase === 'redis'

  // Unmount Nitro's default cache driver (filesystem in dev, memory in prod)
  // This is required because Nitro auto-mounts before plugins run
  await storage.unmount(CACHE_MOUNT_POINT).catch(() => {})

  if (!useRedis) {
    storage.mount(CACHE_MOUNT_POINT, memoryDriver())
    log.info('cache', `Using memory driver (NUXT_CACHE_BASE=${config.cacheBase})`)
    return
  }

  // Unmount the cache driver on shutdown so ioredis connections are closed and
  // the process can exit cleanly after prerender (or normal server shutdown).
  nitroApp.hooks.hookOnce('close', async () => {
    await storage.unmount(CACHE_MOUNT_POINT).catch(() => {})
  })

  log.info('cache', `Testing Redis connection at ${redisHost}:${redisPort}...`)

  const isConnected = await testRedisConnection(redisHost, redisPort, redisPassword)

  if (isConnected) {
    const driver = createRedisDriver({ host: redisHost, port: redisPort, ttl: redisTTL, password: redisPassword })
    storage.mount(CACHE_MOUNT_POINT, driver)
    log.info('cache', `Redis driver mounted at '${CACHE_MOUNT_POINT}' (${redisHost}:${redisPort}, TTL: ${redisTTL}s)`)
  }
  else {
    storage.mount(CACHE_MOUNT_POINT, memoryDriver())
    log.warn('cache', `Redis unavailable, using memory driver (not shared across pods!)`)
  }
})
