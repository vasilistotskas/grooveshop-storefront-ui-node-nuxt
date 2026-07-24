import { defineEventHandler, getRequestHost, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  // ``resource`` must match the origin of the document serving this
  // metadata (RFC 9728 §3.1). The Django API is the logical resource, but
  // the scanner checks origin alignment with the host serving the
  // metadata, so use the storefront URL.
  return {
    resource: siteUrl,
    authorization_servers: [siteUrl],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/llms.txt`,
    scopes_supported: [],
  }
})
