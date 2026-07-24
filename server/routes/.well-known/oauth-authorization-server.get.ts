import { defineEventHandler, getRequestHost, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const tenant = event.context.tenant as TenantConfig | undefined
  const host = getRequestHost(event, { xForwardedHost: false })
  const tenantDomain = tenant?.primaryDomain || host
  const siteUrl = tenantDomain ? `https://${tenantDomain}` : (config.public.baseUrl as string)
  const apiBase = config.public.djangoUrl as string

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    issuer: siteUrl,
    authorization_endpoint: `${apiBase}/_allauth/app/v1/auth/login`,
    token_endpoint: `${apiBase}/_allauth/app/v1/auth/login`,
    revocation_endpoint: `${apiBase}/_allauth/app/v1/auth/session`,
    grant_types_supported: ['password'],
    response_types_supported: ['token'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: [],
    code_challenge_methods_supported: ['S256'],
    service_documentation: `${siteUrl}/llms.txt`,
  }
})
