import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    $schema: 'https://modelcontextprotocol.io/schemas/server-card.json',
    serverInfo: {
      name: 'Webside',
      version: (config.public.version as string) || '1.0.0',
      title: 'Webside MCP',
      description: 'Page index and search for webside.gr (Greek e-commerce storefront).',
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
