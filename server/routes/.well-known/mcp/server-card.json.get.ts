import { defineEventHandler, getRequestHost, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  const storeName = tenant?.storeName || (config.public.appTitle as string)

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://modelcontextprotocol.io/schemas/server-card.json',
    serverInfo: {
      name: storeName,
      version: (config.public.version as string) || '1.0.0',
      title: `${storeName} MCP`,
      description: `Page index and search for ${storeName} (e-commerce storefront).`,
    },
    transport: {
      type: 'http',
      url: `${siteUrl}/llms-full.txt`,
    },
    capabilities: {
      tools: {
        list_pages: {
          description: 'List indexed pages with title, description, and metadata.',
        },
        search_pages: {
          description: 'Full-text search across indexed pages.',
        },
      },
      resources: {
        'pages://': {
          description: 'Markdown representation of any HTML page (request /<route>.md).',
        },
      },
    },
    documentation: `${siteUrl}/llms.txt`,
  }
})
