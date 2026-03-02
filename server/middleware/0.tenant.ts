export default defineEventHandler(async (event) => {
  // Skip static assets and internal Nuxt paths
  if (
    event.path.startsWith('/_nuxt')
    || event.path.startsWith('/_ipx')
    || event.path.startsWith('/assets')
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
