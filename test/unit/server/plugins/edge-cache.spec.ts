/**
 * Only the anonymous pages Nitro replays from its page cache may be stored
 * at the Cloudflare edge; everything else must leave with no edge
 * directive, so Cloudflare never caches it. The rules are the real
 * `server/utils/edgeCache.ts`, on a real node response.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import plugin from '~~/server/plugins/edge-cache'
import { createTestEvent, runNitroPlugin } from '~~/test/helpers/nitro'
import type { TestNitroApp } from '~~/test/helpers/nitro'

const NITRO_SWR = 's-maxage=300, stale-while-revalidate'

let nitroApp: TestNitroApp
/** The status of the response `respond` ended last. */
let lastStatus: number

interface Respond {
  method?: string
  tenant?: object | null
  status?: number
  headers?: Record<string, string | undefined>
  headersSent?: boolean
  degradedRender?: { status: number }
}

/** Run the request hook, set the response as the handler would, then end it the way h3 does. */
async function respond(url: string, options: Respond = {}) {
  const event = createTestEvent({
    url,
    method: options.method,
    context: { tenant: options.tenant === undefined ? { schemaName: 'demo' } : options.tenant, degradedRender: options.degradedRender },
  })
  await nitroApp.hooks.callHook('request', event)
  const res = event.node.res
  res.statusCode = options.status ?? 200
  const headers = options.headers ?? { 'cache-control': NITRO_SWR, 'content-type': 'text/html;charset=utf-8' }
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) res.setHeader(name, value)
  }
  if (options.headersSent) res.writeHead(res.statusCode)
  res.end('<html>')
  lastStatus = res.statusCode
  return {
    'cache-control': res.getHeader('cache-control'),
    'cloudflare-cdn-cache-control': res.getHeader('cloudflare-cdn-cache-control'),
    'cache-tag': res.getHeader('cache-tag'),
  }
}

describe('server/plugins/edge-cache', () => {
  beforeEach(async () => {
    nitroApp = await runNitroPlugin(plugin)
  })

  it('marks a cached page for the edge, tags it, and tells browsers to revalidate', async () => {
    expect(await respond('/products/12/phone')).toEqual({
      'cache-control': 'no-cache',
      'cloudflare-cdn-cache-control': 'max-age=60, stale-while-revalidate=86400',
      'cache-tag': 'storefront-html,storefront-html-demo',
    })
  })

  it('marks the page payload a client navigation fetches', async () => {
    const headers = { 'cache-control': NITRO_SWR, 'content-type': 'application/json' }

    expect((await respond('/blog/_payload.json?_b=abc', { headers }))['cache-tag']).toBe('storefront-html,storefront-html-demo')
  })

  it('replaces the headers of the 304 h3 sends itself on a revalidation', async () => {
    const response = await respond('/', { status: 304, headers: { 'cache-control': 'public, max-age=300, s-maxage=300' } })

    expect(response).toMatchObject({
      'cache-control': 'no-cache',
      'cloudflare-cdn-cache-control': 'max-age=60, stale-while-revalidate=86400',
    })
  })

  it.each<[string, string, Respond]>([
    ['an uncached page (account, checkout)', '/account', {}],
    ['a response that did not come from Nitro\'s page cache', '/', { headers: { 'content-type': 'text/html' } }],
    ['markdown served on a page URL', '/products', { headers: { 'cache-control': NITRO_SWR, 'content-type': 'text/markdown; charset=utf-8' } }],
    ['an API response with its own SWR cache', '/api/products', {}],
    ['an error', '/', { status: 404 }],
    ['a POST', '/', { method: 'POST' }],
    ['a tenant-less request', '/', { tenant: null }],
  ])('leaves %s without an edge directive', async (_label, url, options) => {
    expect((await respond(url, options))['cloudflare-cdn-cache-control']).toBeUndefined()
  })

  it.each<[string, string, Respond]>([
    ['a page rendered with the visitor\'s session', '/account', { headers: { 'content-type': 'text/html;charset=utf-8' } }],
    ['its payload', '/account/_payload.json', { headers: { 'content-type': 'application/json' } }],
    ['a 404 Nitro stamped with its SWR header', '/products/999/gone', { status: 404 }],
    ['a 500 on a cached route', '/', { status: 500 }],
    ['a cached route of a tenant-less request', '/', { tenant: null }],
  ])('marks %s private', async (_label, url, options) => {
    expect(await respond(url, options)).toEqual({
      'cache-control': 'private, no-store',
      'cloudflare-cdn-cache-control': undefined,
      'cache-tag': undefined,
    })
  })

  it.each<[string, string, Respond]>([
    ['a redirect', '/home', { status: 301, headers: { 'content-type': 'text/html', 'cache-control': 'max-age=3600' } }],
    ['an API response', '/api/products', { headers: { 'content-type': 'application/json', 'cache-control': NITRO_SWR } }],
    ['markdown with its own policy', '/products', { headers: { 'content-type': 'text/markdown', 'cache-control': 'public, max-age=300' } }],
  ])('leaves the Cache-Control of %s alone', async (_label, url, options) => {
    expect((await respond(url, options))['cache-control']).toBe(options.headers!['cache-control'])
  })

  it.each<[string, string, Respond]>([
    ['an auth answer with no caching of its own', '/api/_allauth/app/v1/auth/session', { headers: { 'content-type': 'application/json' } }],
    ['an expired session (410)', '/api/_allauth/app/v1/auth/session', { status: 410, headers: { 'content-type': 'application/json' } }],
    ['a 404 Nitro stamped with its SWR header', '/api/products/999', { status: 404, headers: { 'content-type': 'application/json', 'cache-control': NITRO_SWR } }],
    ['the bare /api', '/api', { status: 404, headers: { 'content-type': 'application/json' } }],
  ])('marks %s private', async (_label, url, options) => {
    expect((await respond(url, options))['cache-control']).toBe('private, no-store')
  })

  it.each<[string, string, Respond]>([
    ['an icon with its own policy', '/api/_nuxt_icon/lucide.json', { headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=31536000' } }],
    ['a redirect', '/api/auth/oauth', { status: 302, headers: { 'content-type': 'text/html', 'cache-control': 'max-age=60' } }],
  ])('leaves the Cache-Control of %s alone', async (_label, url, options) => {
    expect((await respond(url, options))['cache-control']).toBe(options.headers!['cache-control'])
  })

  it('leaves a POST to /api alone', async () => {
    expect((await respond('/api/_allauth/app/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' } }))['cache-control']).toBeUndefined()
  })

  it('does not touch a response whose headers are already sent', async () => {
    expect((await respond('/', { headersSent: true }))['cache-control']).toBe(NITRO_SWR)
  })

  describe('a render that fell back to defaults (shared/constants/degradedRender.ts)', () => {
    const degraded = { status: 503, degradedRender: { status: 200 }, headers: { 'cache-control': NITRO_SWR, 'content-type': 'text/html;charset=utf-8' } }

    it('answers with the real status and no cache directive anywhere', async () => {
      expect(await respond('/products/12/phone', degraded)).toEqual({
        'cache-control': 'private, no-store',
        'cloudflare-cdn-cache-control': undefined,
        'cache-tag': undefined,
      })
      expect(lastStatus).toBe(200)
    })

    it('does the same for the payload a client navigation fetches', async () => {
      expect(await respond('/products/12/phone/_payload.json', { ...degraded, headers: { 'cache-control': NITRO_SWR, 'content-type': 'application/json' } }))
        .toMatchObject({ 'cache-control': 'private, no-store', 'cache-tag': undefined })
      expect(lastStatus).toBe(200)
    })

    it('puts back the status the render had, even for an error page', async () => {
      await respond('/nope', { ...degraded, degradedRender: { status: 404 } })
      expect(lastStatus).toBe(404)
    })

    it('leaves a status the page set itself after falling back', async () => {
      await respond('/nope', { ...degraded, status: 404 })
      expect(lastStatus).toBe(404)
    })

    it('leaves an ordinary 503 alone', async () => {
      await respond('/', { status: 503, headers: { 'content-type': 'text/html' } })
      expect(lastStatus).toBe(503)
    })
  })
})
