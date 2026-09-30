import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/.well-known/ai-catalog.json.get'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { callRoute } from '~~/test/helpers/nitro'

const route = '/.well-known/ai-catalog.json'

const get = (context: Record<string, unknown> = {}) =>
  callRoute(handler, { route, host: 'acme.test', headers: { 'x-forwarded-host': 'evil.example' }, context })

describe('GET /.well-known/ai-catalog.json', () => {
  it('lists the gateway Server Card at the reserved /mcp/server-card for an agent-commerce tenant', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example', { storeName: 'Acme Store', agentCommerceEnabled: true }) })

    expect(response.headers.get('content-type')).toBe('application/ai-catalog+json')
    expect(response.body).toEqual({
      specVersion: '1.0',
      host: { displayName: 'Acme Store', identifier: 'acme.example' },
      entries: [{
        identifier: 'urn:air:acme.example:mcp:store',
        type: 'application/mcp-server-card+json',
        url: 'https://acme.example/mcp/server-card',
      }],
    })
  })

  it('lists no entries when the tenant has agent commerce off', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example', { agentCommerceEnabled: false }) })

    expect(response.body.entries).toEqual([])
  })

  it('names the request Host and the platform title, with no entries, when no tenant is in context', async () => {
    const response = await get()

    expect(response.body.host).toEqual({ displayName: 'GrooveShop', identifier: 'acme.test' })
    expect(response.body.entries).toEqual([])
  })
})
