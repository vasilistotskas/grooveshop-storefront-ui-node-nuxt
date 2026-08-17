import { defineEventHandler, getRequestHost, setHeader } from 'h3'

// RFC 9728 path-insertion form for the /mcp resource — MCP clients
// derive this URL from the server endpoint (https://<host>/mcp →
// /.well-known/oauth-protected-resource/mcp) and use it to discover the
// authorization server for account linking. The agent gateway's 401
// challenge also points here via WWW-Authenticate resource_metadata.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  // The authorization server is the tenant's OWN API origin — every
  // tenant owns an ``api.<domain>`` subdomain (infra TEMPLATE contract).
  const apiBase = tenantDomain
    ? `https://api.${tenantDomain}`
    : (config.public.djangoUrl as string)

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    resource: `${siteUrl}/mcp`,
    authorization_servers: [apiBase],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/llms.txt`,
    scopes_supported: ['openid', 'profile', 'email', 'orders:read', 'loyalty:read', 'favourites:read'],
  }
})
