import { defineEventHandler, getRequestHost, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const tenant = event.context.tenant
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)

  event.res.headers.set('content-type', 'application/linkset+json')
  event.res.headers.set('cache-control', 'public, max-age=3600')

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
