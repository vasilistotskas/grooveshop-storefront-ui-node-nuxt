import { describe, expect, it } from 'vitest'
import { bypassesTenantMiddleware, isTenantFreePath } from '~~/server/utils/tenantBypass'
import { createRequestEvent } from '~~/test/helpers/nitro'

/**
 * The one bypass list: `0.tenant.ts` skips every path on it, and the
 * plugins that run for every request skip only the TENANT-FREE ones. A
 * path whose own handler needs the store (llms.txt, a `.md` mirror, the
 * manifest) bypasses the middleware but is not tenant-free.
 */
describe('isTenantFreePath', () => {
  it.each([
    '/api/_alive',
    '/_health',
    '/_nuxt/builds/meta/XXX.json',
    '/_ipx/w_200/logo.png',
    '/platform-favicon/favicon-32x32.png',
    '/api/admin/cache/purge',
    '/api/texts/catalogue',
    '/api/texts/validate',
    '/api/builder/catalogue',
    '/api/builder/convert-legacy',
  ])('says %s needs no store', (path) => {
    expect(isTenantFreePath(path)).toBe(true)
  })

  it.each([
    '/',
    '/products',
    '/health',
    '/api/health',
    '/assets/main.css',
    '/openapi',
    '/llms.txt',
    '/llms-full.txt',
    '/robots.txt',
    '/manifest.webmanifest',
    '/favicon.ico',
    '/favicon/apple-touch-icon.png',
    '/api/__sitemap__/urls',
    '/products/1/some-product.md',
  ])('says %s may need the store', (path) => {
    expect(isTenantFreePath(path)).toBe(false)
  })
})

describe('bypassesTenantMiddleware', () => {
  it('bypasses the tenant-free paths and the ones that resolve the store themselves', () => {
    for (const url of ['/api/_alive', '/llms.txt', '/robots.txt', '/favicon/x.png', '/api/__sitemap__/urls']) {
      expect(bypassesTenantMiddleware(createRequestEvent({ url }))).toBe(true)
    }
    expect(bypassesTenantMiddleware(createRequestEvent({ url: '/products' }))).toBe(false)
  })

  it('bypasses a .md mirror on GET only, and not the markdown negotiation re-fetch', () => {
    const url = '/products/1/some-product.md'

    expect(bypassesTenantMiddleware(createRequestEvent({ url }))).toBe(true)
    expect(bypassesTenantMiddleware(createRequestEvent({ url, method: 'POST' }))).toBe(false)
    expect(bypassesTenantMiddleware(createRequestEvent({ url, headers: { 'x-md-negotiation-internal': '1' } }))).toBe(false)
  })
})
