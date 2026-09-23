import { defineEventHandler, getRequestHost, setHeader } from 'h3'

/**
 * AI Catalog (https://github.com/Agent-Card/ai-catalog) — the site-wide
 * discovery document MCP Server Cards (SEP-2127) are found through.
 *
 * The card itself is served by the agent gateway at the location the
 * Server Card extension reserves, `<streamable-http-url>/server-card`
 * (`/mcp/server-card`), so it stays consistent with what the live MCP
 * server reports. A store with agent commerce off has no MCP endpoint and
 * lists no entries.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  const publisher = new URL(siteUrl).hostname
  const storeName = tenant?.storeName || (config.public.appTitle as string)

  setHeader(event, 'content-type', 'application/ai-catalog+json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    specVersion: '1.0',
    host: {
      displayName: storeName,
      identifier: publisher,
    },
    entries: tenant?.agentCommerceEnabled
      ? [
          {
            identifier: `urn:air:${publisher}:mcp:store`,
            type: 'application/mcp-server-card+json',
            url: `${siteUrl}/mcp/server-card`,
          },
        ]
      : [],
  }
})
