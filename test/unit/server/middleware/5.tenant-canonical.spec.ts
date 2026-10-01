/**
 * Regression guard for the multi-tenant canonical redirect: the
 * @nuxtjs/seo `redirectToCanonicalSiteUrl` module middleware compared
 * every request host against the env-frozen platform site URL and
 * 301'd every other tenant's storefront onto tenant #1's domain. The
 * replacement must canonicalize each tenant onto its OWN
 * primaryDomain — and never touch API routes, mutations, or requests
 * without tenant context.
 */
import { describe, expect, it } from 'vitest'
import { getResponseHeader, getResponseStatus } from 'h3'
import middleware from '~~/server/middleware/5.tenant-canonical'
import { callHandler, createTestEvent } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

const ACME = { primaryDomain: 'acme.example' }

async function run(req: TestRequest & { tenant?: Record<string, unknown> }) {
  const event = createTestEvent({ ...req, context: req.tenant ? { tenant: req.tenant } : {} })
  await callHandler(middleware, event)
  const location = getResponseHeader(event, 'location')
  return location ? { status: getResponseStatus(event), location } : undefined
}

describe('server/middleware/5.tenant-canonical', () => {
  it('passes through requests on the tenant primary domain', async () => {
    expect(await run({ tenant: ACME, host: 'acme.example' })).toBeUndefined()
  })

  it('301s alias hosts onto the tenant primary domain, preserving the path', async () => {
    expect(await run({ tenant: ACME, host: 'alias.example', url: '/products/3?x=1' }))
      .toEqual({ status: 301, location: 'https://acme.example/products/3?x=1' })
  })

  it('never redirects a DIFFERENT tenant onto the platform domain (the original bug)', async () => {
    const tenant2 = { primaryDomain: 'tenant2-staging.webside.gr' }

    expect(await run({ tenant: tenant2, host: 'tenant2-staging.webside.gr' })).toBeUndefined()
  })

  it('compares the Host, not X-Forwarded-Host, so a spoofed header cannot suppress or aim the redirect', async () => {
    expect(await run({ tenant: ACME, host: 'alias.example', headers: { 'x-forwarded-host': 'acme.example' } }))
      .toEqual({ status: 301, location: 'https://acme.example/' })
  })

  it('strips ports before comparing hosts', async () => {
    expect(await run({ tenant: ACME, host: 'acme.example:3000' })).toBeUndefined()
  })

  it('301s a Host in another case onto the canonical one, before anything renders or caches', async () => {
    // The page cache varies on the raw Host: `ACME.example` would be an
    // entry of its own that the merchant's purge (lower-case) never reaches.
    expect(await run({ tenant: ACME, host: 'ACME.example', url: '/products/3' }))
      .toMatchObject({ status: 301, location: 'https://acme.example/products/3' })
  })

  it('skips API routes even on alias hosts', async () => {
    expect(await run({ tenant: ACME, host: 'alias.example', url: '/api/cart' })).toBeUndefined()
  })

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('skips %s', async (method) => {
    expect(await run({ tenant: ACME, host: 'alias.example', method })).toBeUndefined()
  })

  it('redirects HEAD like GET', async () => {
    expect((await run({ tenant: ACME, host: 'alias.example', method: 'HEAD' }))?.status).toBe(301)
  })

  it.each([
    ['no tenant', undefined],
    ['a tenant without primaryDomain', {}],
  ])('does nothing with %s', async (_label, tenant) => {
    expect(await run({ tenant, host: 'alias.example' })).toBeUndefined()
  })
})
