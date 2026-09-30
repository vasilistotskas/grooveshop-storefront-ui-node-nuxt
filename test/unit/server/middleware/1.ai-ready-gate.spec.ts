/**
 * nuxt-ai-ready's discovery surfaces share one tenant-less index, so they
 * are served only on the platform's own storefront and 404 on every
 * other host. The tenant lookup is real; the backend answers it.
 */
import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/1.ai-ready-gate'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, callHandler, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

const run = (req: TestRequest) => callHandler(middleware, createTestEvent(req))

describe('server/middleware/1.ai-ready-gate', () => {
  it.each(['/llms.txt', '/llms-full.txt', '/products/1/slug.md'])('serves %s on the platform storefront', async (url) => {
    backend.reply(validTenantConfig('shop.test', { isPlatformStorefront: true }))

    await expect(run({ url })).resolves.toBeUndefined()
    expect(backend.lastRequest.query).toEqual({ domain: 'shop.test' })
  })

  it.each([
    ['another store', validTenantConfig('shop.test')],
    ['an unknown host', jsonResponse({ detail: 'Not found.' }, 404)],
  ])('404s /llms.txt on %s', async (_label, reply) => {
    backend.reply(reply)

    await expect(run({ url: '/llms.txt' })).rejects.toMatchObject({ statusCode: 404 })
  })

  it('decides by the Host, so a forwarded platform host cannot unlock a store\'s index', async () => {
    backend.reply(validTenantConfig('shop.test'))

    await expect(run({ url: '/llms.txt', headers: { 'x-forwarded-host': 'platform.test' } })).rejects.toMatchObject({ statusCode: 404 })
    expect(backend.lastRequest.query).toEqual({ domain: 'shop.test' })
  })

  it.each([
    ['a non-AI path', { url: '/products' }],
    ['a POST', { url: '/llms.txt', method: 'POST' }],
    ['an /api/ path ending in .md', { url: '/api/docs/readme.md' }],
    ['the internal .md negotiation re-fetch', { url: '/products/1/slug.md', headers: { 'x-md-negotiation-internal': '1' } }],
  ])('lets %s through without a lookup', async (_label, req) => {
    await expect(run(req)).resolves.toBeUndefined()
    expect(backend.requests).toEqual([])
  })
})
