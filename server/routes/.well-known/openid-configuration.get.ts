import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig(event)
  const siteUrl = (config.public.baseUrl as string) || 'https://webside.gr'
  const apiBase = (config.public.djangoUrl as string) || 'https://api.webside.gr'

  setHeader(event, 'content-type', 'application/json')
  setHeader(event, 'cache-control', 'public, max-age=3600')

  return {
    issuer: siteUrl,
    authorization_endpoint: `${apiBase}/_allauth/app/v1/auth/login`,
    token_endpoint: `${apiBase}/_allauth/app/v1/auth/login`,
    userinfo_endpoint: `${apiBase}/_allauth/app/v1/account/email`,
    revocation_endpoint: `${apiBase}/_allauth/app/v1/auth/session`,
    grant_types_supported: ['password', 'urn:ietf:params:oauth:grant-type:token-exchange'],
    response_types_supported: ['token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'none'],
    scopes_supported: ['openid', 'profile', 'email'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['none'],
    code_challenge_methods_supported: ['S256'],
    service_documentation: `${siteUrl}/llms.txt`,
  }
})
