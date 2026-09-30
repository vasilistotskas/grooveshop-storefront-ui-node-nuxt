import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/.well-known/oauth-protected-resource/mcp.get'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { callRoute } from '~~/test/helpers/nitro'

const route = '/.well-known/oauth-protected-resource/mcp'

const get = (context: Record<string, unknown> = {}) =>
  callRoute(handler, { route, host: 'acme.test', headers: { 'x-forwarded-host': 'evil.example' }, context })

describe('GET /.well-known/oauth-protected-resource/mcp', () => {
  it('names the tenant MCP endpoint as the resource and its own API origin as the authorization server', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example', { apiDomain: 'api.acme.example' }) })

    expect(response.body).toMatchObject({
      resource: 'https://acme.example/mcp',
      authorization_servers: ['https://api.acme.example'],
    })
  })

  it('falls back to the platform djangoUrl when the tenant has no apiDomain', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example', { apiDomain: '' }) })

    expect(response.body.authorization_servers).toEqual(['https://platform.test'])
  })

  it('uses the request Host, never X-Forwarded-Host, when no tenant is in context', async () => {
    const response = await get()

    expect(response.body.resource).toBe('https://acme.test/mcp')
  })
})
