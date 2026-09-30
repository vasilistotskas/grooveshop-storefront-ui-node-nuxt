/**
 * Tenant gating of the platform's static icon files. Browsers request
 * `/favicon.ico` unprompted, so head-link gating alone cannot stop a
 * tenant's domain from serving the PLATFORM'S brand bytes — this
 * middleware must 404 unbranded tenants, redirect branded ones, and
 * send only the platform / unresolvable hosts to the platform asset.
 *
 * The tenant lookup and `isPlatformTenantConfig` are real; the backend's
 * resolve endpoint answers.
 */
import { describe, expect, it } from 'vitest'
import { getResponseHeader, getResponseStatus } from 'h3'
import middleware from '~~/server/middleware/6.tenant-favicon'
import { validTenantConfig } from '~~/test/fixtures/tenantConfig'
import { backend, callHandler, createTestEvent, jsonResponse } from '~~/test/helpers/nitro'

async function request(url: string) {
  const event = createTestEvent({ url, host: 'tenant.example' })
  const body = await callHandler(middleware, event)
  return {
    body,
    status: getResponseStatus(event),
    location: getResponseHeader(event, 'location'),
    cacheControl: getResponseHeader(event, 'cache-control'),
  }
}

describe('server/middleware/6.tenant-favicon', () => {
  it('ignores non-icon paths without resolving a tenant', async () => {
    const response = await request('/products')

    expect(response).toMatchObject({ body: undefined, location: undefined, cacheControl: undefined })
    expect(backend.requests).toEqual([])
  })

  it.each([
    ['/favicon.ico', '/platform-favicon/favicon.ico'],
    ['/favicon.ico?v=2', '/platform-favicon/favicon.ico'],
    ['/favicon/apple-touch-icon.png', '/platform-favicon/apple-touch-icon.png'],
  ])('redirects the platform tenant from %s to %s', async (url, target) => {
    backend.reply(validTenantConfig('tenant.example', { isPlatformStorefront: true }))

    expect(await request(url)).toMatchObject({ status: 302, location: target, cacheControl: 'public, max-age=3600' })
  })

  it.each([
    ['an unknown host', jsonResponse({ detail: 'Not found.' }, 404)],
    ['a backend outage', jsonResponse({ detail: 'down' }, 503)],
  ])('falls back to the platform asset for %s', async (_label, reply) => {
    backend.reply(reply)

    expect(await request('/favicon/apple-touch-icon.png'))
      .toMatchObject({ status: 302, location: '/platform-favicon/apple-touch-icon.png' })
  })

  it('redirects a branded tenant to its own favicon', async () => {
    backend.reply(validTenantConfig('tenant.example', { faviconUrl: 'https://assets.tenant.example/fav.png' }))

    expect(await request('/favicon.ico'))
      .toMatchObject({ status: 302, location: 'https://assets.tenant.example/fav.png', cacheControl: 'public, max-age=3600' })
  })

  it.each(['/favicon.ico', '/favicon.png', '/logo.svg', '/favicon/apple-touch-icon.png'])(
    '404s an unbranded tenant on %s (never platform brand bytes)',
    async (url) => {
      backend.reply(validTenantConfig('tenant.example'))

      expect(await request(url)).toMatchObject({ status: 404, body: '', location: undefined, cacheControl: 'public, max-age=3600' })
    },
  )
})
