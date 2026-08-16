import { defineEventHandler, setHeader } from 'h3'

// RFC 9728 protected-resource metadata (root form). The MCP commerce
// endpoint (/mcp on this host, served by the agent gateway) is the
// protected resource; the Django API is the OAuth authorization server
// (allauth.idp — discovery at {issuer}/.well-known/openid-configuration
// and /.well-known/oauth-authorization-server).
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'
  const apiBase = (config.public.djangoUrl as string) || 'https://api.webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    resource: siteUrl,
    authorization_servers: [apiBase],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/llms.txt`,
    scopes_supported: ['openid', 'profile', 'email', 'orders:read', 'loyalty:read', 'favourites:read'],
  }
})
