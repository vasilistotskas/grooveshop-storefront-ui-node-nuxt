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
}

/**
 * Creates a Redis driver with ioredis configuration optimized for graceful error handling.
 * The unstorage redis driver uses ioredis internally.
 */
function createRedisDriver({ host, port, ttl }: RedisDriverOptions): Driver {
  return redisDriver({
    base: CACHE_MOUNT_POINT,
    host,
    port,
    ttl,
    // ioredis options for graceful error handling
    lazyConnect: true,
    maxRetriesPerRequest: 3,
    retryStrategy: (times: number) => {
      if (times > 3) {
        console.warn(`[Cache] ioredis: Max retries reached, giving up`)
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
async function testRedisConnection(host: string, port: number): Promise<boolean> {
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
  })

  client.on('error', () => {}) // Suppress error logs during test

  try {
    await client.connect()
    const pong = await client.ping()
    await client.disconnect()
    return pong === 'PONG'
  }
  catch {
    return false
  }
}

export default defineNitroPlugin(async () => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  const { host, port, ttl } = config.redis
  const redisHost = host as string
  const redisPort = Number(port)
  const redisTTL = Number(ttl)
  const useRedis = config.cacheBase === 'redis'

  // Unmount Nitro's default cache driver (filesystem in dev, memory in prod)
  // This is required because Nitro auto-mounts before plugins run
  await storage.unmount(CACHE_MOUNT_POINT).catch(() => {})

  if (!useRedis) {
    storage.mount(CACHE_MOUNT_POINT, memoryDriver())
    console.log(`[Cache] Using memory driver (NUXT_CACHE_BASE=${config.cacheBase})`)
    return
  }

  console.log(`[Cache] Testing Redis connection at ${redisHost}:${redisPort}...`)

  const isConnected = await testRedisConnection(redisHost, redisPort)

  if (isConnected) {
    const driver = createRedisDriver({ host: redisHost, port: redisPort, ttl: redisTTL })
    storage.mount(CACHE_MOUNT_POINT, driver)
    console.log(`[Cache] ✅ Redis driver mounted at '${CACHE_MOUNT_POINT}' (${redisHost}:${redisPort}, TTL: ${redisTTL}s)`)
  }
  else {
    storage.mount(CACHE_MOUNT_POINT, memoryDriver())
    console.warn(`[Cache] ⚠️ Redis unavailable, using memory driver (not shared across pods!)`)
  }
})
