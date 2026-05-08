import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const apiBase = (config.public.djangoUrl as string) || 'https://api.webside.gr'
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    resource: apiBase,
    authorization_servers: [siteUrl],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/llms.txt`,
    scopes_supported: [],
  }
})
