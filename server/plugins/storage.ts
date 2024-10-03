import redisDriver from 'unstorage/drivers/redis'

export default defineNitroPlugin(() => {
  const storage = useStorage()
  const redisConfig = useRuntimeConfig().redis as {
    host: string
    port: string
    ttl: string
  }

  const driver = redisDriver({
    base: 'redis',
    host: redisConfig.host,
    port: Number(redisConfig.port),
    ttl: Number(redisConfig.ttl),
  })

  storage.mount('redis', driver)
})
