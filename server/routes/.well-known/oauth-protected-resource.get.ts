import { defineEventHandler, getRequestHost, setHeader } from 'h3'

// RFC 9728 protected-resource metadata (root form). The MCP commerce
// endpoint (/mcp on this host, served by the agent gateway) is the
// protected resource; the Django API is the OAuth authorization server
// (allauth.idp — discovery at {issuer}/.well-known/openid-configuration
// and /.well-known/oauth-authorization-server).
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  // The authorization server is the tenant's OWN API origin
  // (``TenantConfig.apiDomain``, e.g. ``api.tenant.com``). Platform env
  // fallback covers dev setups / prerender passes without a resolved tenant.
  const apiBase = tenant?.apiDomain
    ? `https://${tenant.apiDomain}`
    : (config.public.djangoUrl as string)

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  // ``resource`` must match the origin of the document serving this
  // metadata (RFC 9728 §3.1). The Django API is the logical resource, but
  // the scanner checks origin alignment with the host serving the
  // metadata, so use the storefront URL.
  return {
    resource: siteUrl,
    authorization_servers: [apiBase],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/llms.txt`,
    scopes_supported: ['openid', 'profile', 'email', 'orders:read', 'loyalty:read', 'favourites:read'],
  }
})
