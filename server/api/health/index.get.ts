// Platform-level health check. Intentionally *not* tenant-scoped —
// the tenant middleware (server/middleware/0.tenant.ts) skips
// /api/health so K8s probes don't need a real tenant domain, and the
// Django /health endpoint answers DB/Redis/Celery readiness which is
// per-cluster, not per-tenant. A single cache entry per Nitro worker
// is correct here.
export default defineCachedEventHandler(async () => {
  const config = useRuntimeConfig()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/health`,
      {
        method: 'GET',
      })
    return await parseDataAs(response, zHealthCheckResponse)
  }
  catch (error) {
    await handleError(error)
  }
}, {
  name: 'NuxtHealthCheck',
  maxAge: 15,
  swr: true,
  staleMaxAge: 30,
  getKey: () => 'nuxt:health:v1',
})
