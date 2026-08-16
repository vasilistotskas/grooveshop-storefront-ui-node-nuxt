import { defineEventHandler, setHeader } from 'h3'

// RFC 9728 path-insertion form for the /mcp resource — MCP clients
// derive this URL from the server endpoint (https://<host>/mcp →
// /.well-known/oauth-protected-resource/mcp) and use it to discover the
// authorization server for account linking. The agent gateway's 401
// challenge also points here via WWW-Authenticate resource_metadata.
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'
  const apiBase = (config.public.djangoUrl as string) || 'https://api.webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    resource: `${siteUrl}/mcp`,
    authorization_servers: [apiBase],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/llms.txt`,
    scopes_supported: ['openid', 'profile', 'email', 'orders:read', 'loyalty:read'],
  }
})
