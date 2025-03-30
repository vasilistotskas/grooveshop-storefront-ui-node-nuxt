import { createClient } from 'redis'
import redisDriver from 'unstorage/drivers/redis'
import memoryDriver from 'unstorage/drivers/memory'

export default defineNitroPlugin(async () => {
  const storage = useStorage()
  const config = useRuntimeConfig()

  const redisConfig = config.redis

  let driver

  try {
    const client = createClient({
      socket: {
        host: redisConfig.host,
        port: Number(redisConfig.port),
      },
    })

    await client.connect()
    await client.ping()

    driver = redisDriver({
      base: 'redis',
      host: redisConfig.host,
      port: Number(redisConfig.port),
      ttl: Number(redisConfig.ttl),
    })

    await client.disconnect()
  }
  catch (error) {
    console.error('Redis connection failed, falling back to in-memory storage:', error)
    driver = memoryDriver()
  }

  storage.mount(config.cacheBase, driver)
})
