import { defineEventHandler, getRequestHost, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)

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
