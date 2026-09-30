import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/0.tenant'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, callHandler, createTestEvent, jsonResponse, loggerOf } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

/**
 * The tenant lookup is real (`server/utils/tenant.ts`): the backend's
 * resolve endpoint is what answers, so the payload goes through the real
 * `zTenantConfig` and the `domain` sent is what the middleware chose.
 */
const tenant = validTenantConfig('shop.test', { schemaName: 'shop', name: 'Shop' })

function run(req: TestRequest) {
  const event = createTestEvent(req)
  return { event, result: callHandler(middleware, event) }
}

describe('server/middleware/0.tenant', () => {
  it.each([
    '/_nuxt/builds/meta/XXX.json',
    '/_ipx/w_200/logo.png',
    '/assets/main.css',
    '/api/health',
    '/api/health/live',
    '/api/__sitemap__/urls',
    '/platform-favicon/favicon-32x32.png',
    '/favicon/apple-touch-icon.png',
    '/api/_alive',
    '/health',
    '/favicon.ico',
    '/favicon.png',
    '/logo.svg',
    '/robots.txt',
    '/manifest.webmanifest',
    '/openapi',
    '/_health',
    '/llms.txt',
    '/llms-full.txt',
    // Django's cache purge arrives with no tenant Host; resolving it
    // 404'd before the route's own token check and silently killed SSR
    // cache invalidation in production.
    '/api/admin/cache/purge',
  ])('serves %s without resolving a tenant', async (url) => {
    const { event, result } = run({ url, host: 'pod-10-0-0-1' })

    await expect(result).resolves.toBeUndefined()
    expect(backend.requests).toEqual([])
    expect(event.context.tenant).toBeUndefined()
  })

  it('resolves the tenant from the Host header, never X-Forwarded-Host', async () => {
    backend.reply(tenant)
    const { event, result } = run({ url: '/products', headers: { 'x-forwarded-host': 'evil.example' } })

    await result

    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/tenant/resolve')
    expect(backend.lastRequest.query).toEqual({ domain: 'shop.test' })
    expect(event.context.tenant).toEqual(tenant)
  })

  it('puts the store on the request wide event', async () => {
    backend.reply(tenant)
    const { event, result } = run({ url: '/' })

    await result

    expect(loggerOf(event).fields).toEqual({ tenantSchema: 'shop', tenantName: 'Shop' })
  })

  it('still resolves the tenant when a client sends x-nitro-prerender', async () => {
    // The prerender bypass is `import.meta.prerender`, fixed at build
    // time. It used to be this header, which any visitor can send to
    // render a tenant's domain with no tenant bound.
    backend.reply(tenant)
    const { event, result } = run({ url: '/products', headers: { 'x-nitro-prerender': '1' } })

    await result

    expect(event.context.tenant).toEqual(tenant)
  })

  it('bypasses a genuine external GET of a .md mirror', async () => {
    const { event, result } = run({ url: '/products/1/slug.md' })

    await result

    expect(backend.requests).toEqual([])
    expect(event.context.tenant).toBeUndefined()
  })

  it('resolves the tenant for the internal .md negotiation re-fetch', async () => {
    backend.reply(tenant)
    const { event, result } = run({ url: '/products/1/slug.md', headers: { 'x-md-negotiation-internal': '1' } })

    await result

    expect(event.context.tenant).toEqual(tenant)
  })

  it('resolves the tenant for a non-GET request to a .md path', async () => {
    backend.reply(tenant)
    const { event, result } = run({ url: '/products/1/slug.md', method: 'POST' })

    await result

    expect(event.context.tenant).toEqual(tenant)
  })

  it('answers 404 "Store not found" for a host no store owns', async () => {
    backend.reply(jsonResponse({ detail: 'Not found.' }, 404))

    await expect(run({ url: '/' }).result).rejects.toMatchObject({ statusCode: 404, statusMessage: 'Store not found' })
  })

  it('answers 503, not 404, when the backend fails transiently', async () => {
    backend.reply(jsonResponse({ detail: 'down' }, 502))

    await expect(run({ url: '/' }).result).rejects.toMatchObject({ statusCode: 503 })
  })
})
