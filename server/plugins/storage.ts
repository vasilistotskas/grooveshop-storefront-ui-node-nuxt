import { createClient } from 'redis'
import redisDriver from 'unstorage/drivers/redis'
import memoryDriver from 'unstorage/drivers/memory'

export default defineNitroPlugin(async () => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  const redisConfig = config.redis
  const redisHost = redisConfig.host
  const redisPort = Number(redisConfig.port)
  const redisTTL = Number(redisConfig.ttl)

  console.log(`[Nitro Storage] Attempting to connect to Redis at ${redisHost}:${redisPort}`)

  let driver
  let isRedisConnected = false

  try {
    const client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
        connectTimeout: 5000,
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.error('[Nitro Storage] Redis reconnection failed after 3 attempts')
            return false
          }
          return Math.min(retries * 100, 3000)
        },
      },
    })

    client.on('error', (err) => {
      console.error('[Nitro Storage] Redis client error:', err.message)
    })

    await client.connect()
    const pingResult = await client.ping()

    if (pingResult === 'PONG') {
      console.log(`[Nitro Storage] ✅ Redis connection successful at ${redisHost}:${redisPort}`)
      isRedisConnected = true

      driver = redisDriver({
        base: 'redis',
        host: redisHost,
        port: redisPort,
        ttl: redisTTL,
      })
    }

    await client.close()
  }
  catch (error) {
    console.error('[Nitro Storage] ❌ Redis connection failed:', error instanceof Error ? error.message : error)
    console.error('[Nitro Storage] ⚠️  Falling back to in-memory storage (cache will NOT be shared across pods!)')
    driver = memoryDriver()
  }

  storage.mount(config.cacheBase, driver)

  if (isRedisConnected) {
    console.log(`[Nitro Storage] Cache storage mounted at '${config.cacheBase}' using Redis driver`)
  }
  else {
    console.warn(`[Nitro Storage] Cache storage mounted at '${config.cacheBase}' using MEMORY driver (not recommended for production!)`)
  }
})
