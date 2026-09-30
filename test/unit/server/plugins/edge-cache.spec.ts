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

interface Respond {
  method?: string
  tenant?: object | null
  status?: number
  headers?: Record<string, string | undefined>
  headersSent?: boolean
}

/** Run the request hook, set the response as the handler would, then end it the way h3 does. */
async function respond(url: string, options: Respond = {}) {
  const event = createTestEvent({
    url,
    method: options.method,
    context: { tenant: options.tenant === undefined ? { schemaName: 'demo' } : options.tenant },
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

  it('does not touch a response whose headers are already sent', async () => {
    expect((await respond('/', { headersSent: true }))['cache-control']).toBe(NITRO_SWR)
  })
})
