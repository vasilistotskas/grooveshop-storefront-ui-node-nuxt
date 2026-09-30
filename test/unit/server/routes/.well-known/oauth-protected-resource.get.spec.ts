/**
 * The `.well-known/**` discovery routes are NOT bypassed in 0.tenant.ts,
 * so a real request carries `event.context.tenant`; each falls back to
 * the request Host (never X-Forwarded-Host) when there is none.
 */
import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/.well-known/oauth-protected-resource.get'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { callRoute } from '~~/test/helpers/nitro'

const route = '/.well-known/oauth-protected-resource'

const get = (context: Record<string, unknown> = {}) =>
  callRoute(handler, { route, host: 'acme.test', headers: { 'x-forwarded-host': 'evil.example' }, context })

describe('GET /.well-known/oauth-protected-resource', () => {
  it('names the tenant storefront as the resource and its OWN API origin as the authorization server', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example', { apiDomain: 'api.acme.example' }) })

    expect(response.headers.get('content-type')).toBe('application/json')
    expect(response.headers.get('cache-control')).toBe('public, max-age=3600')
    expect(response.body).toMatchObject({
      resource: 'https://acme.example',
      // TenantConfig.apiDomain — not hand-derived as `api.${primaryDomain}`.
      authorization_servers: ['https://api.acme.example'],
      resource_documentation: 'https://acme.example/llms.txt',
    })
  })

  it('falls back to the platform djangoUrl when the tenant has no apiDomain', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example', { apiDomain: '' }) })

    expect(response.body.authorization_servers).toEqual(['https://platform.test'])
  })

  it('uses the request Host, never X-Forwarded-Host, when no tenant is in context', async () => {
    const response = await get()

    expect(response.body.resource).toBe('https://acme.test')
    expect(JSON.stringify(response.body)).not.toContain('evil.example')
  })
})
