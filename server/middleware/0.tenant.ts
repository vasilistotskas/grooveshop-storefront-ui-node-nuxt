export default defineEventHandler(async (event) => {
  // Skip static assets and internal Nuxt paths. ``/api/health`` +
  // ``/health`` are carved out because K8s liveness/readiness probes
  // hit them with the pod's internal cluster host, which never matches
  // a TenantDomain; without this skip the tenant resolver would 404
  // and the probe would fail, triggering a pod restart loop.
  if (
    event.path.startsWith('/_nuxt')
    || event.path.startsWith('/_ipx')
    || event.path.startsWith('/assets')
    || event.path.startsWith('/api/health')
    || event.path === '/health'
  ) {
    return
  }

  // Skip tenant resolution during build-time prerendering (no real host available)
  if (getRequestHeader(event, 'x-nitro-prerender')) {
    return
  }

  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantConfig = await getTenantConfig(host)

  if (!tenantConfig) {
    throw createError({ statusCode: 404, statusMessage: 'Store not found' })
  }

  event.context.tenant = tenantConfig
})
