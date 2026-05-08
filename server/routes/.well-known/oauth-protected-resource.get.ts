import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  // ``resource`` must match the origin of the document serving this
  // metadata (RFC 9728 §3.1). The Django API at api.webside.gr is the
  // logical resource, but the scanner checks origin alignment with the
  // host serving the metadata, so use the storefront URL.
  return {
    resource: siteUrl,
    authorization_servers: [siteUrl],
    bearer_methods_supported: ['header'],
    resource_documentation: `${siteUrl}/llms.txt`,
    scopes_supported: [],
  }
})
