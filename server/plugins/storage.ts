import redisDriver from 'unstorage/drivers/redis'

export default defineNitroPlugin(() => {
  const storage = useStorage()

  const driver = redisDriver({
    base: 'redis',
    host: useRuntimeConfig().redis.host,
    port: Number(useRuntimeConfig().redis.port),
    ttl: Number(useRuntimeConfig().redis.ttl),
  })

  storage.mount('redis', driver)
})
