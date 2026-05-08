import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'

  setHeader(event, 'content-type', 'application/linkset+json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    linkset: [
      {
        'anchor': `${siteUrl}/openapi/schema.yml`,
        'service-desc': [
          {
            href: `${siteUrl}/openapi/schema.yml`,
            type: 'application/yaml',
          },
          {
            href: `${siteUrl}/openapi/schema.json`,
            type: 'application/json',
          },
        ],
        'service-doc': [
          {
            href: `${siteUrl}/llms.txt`,
            type: 'text/plain',
          },
        ],
      },
    ],
  }
})
