import { describe, expect, it } from 'vitest'
import handler from '~~/server/routes/.well-known/api-catalog.get'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { callRoute } from '~~/test/helpers/nitro'

const route = '/.well-known/api-catalog'

const get = (context: Record<string, unknown> = {}) =>
  callRoute(handler, { route, host: 'acme.test', headers: { 'x-forwarded-host': 'evil.example' }, context })

describe('GET /.well-known/api-catalog', () => {
  it('anchors the RFC 9727 linkset on the tenant storefront', async () => {
    const response = await get({ tenant: validTenantConfig('acme.example') })

    expect(response.headers.get('content-type')).toBe('application/linkset+json')
    const [entry] = response.body.linkset
    expect(entry.anchor).toBe('https://acme.example/openapi/schema.yml')
    expect(entry['service-desc'].map((link: { href: string }) => link.href)).toEqual([
      'https://acme.example/openapi/schema.yml',
      'https://acme.example/openapi/schema.json',
    ])
  })

  it('uses the request Host, never X-Forwarded-Host, when no tenant is in context', async () => {
    const response = await get()

    expect(response.body.linkset[0].anchor).toBe('https://acme.test/openapi/schema.yml')
  })
})
