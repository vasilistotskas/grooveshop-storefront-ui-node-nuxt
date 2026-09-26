/**
 * Only the anonymous pages Nitro replays from its page cache may be stored
 * at the Cloudflare edge; everything else must leave with no edge
 * directive, so Cloudflare never caches it.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isCachedSsrRoute } from '../../../../shared/constants/prerender'

let responseHeaders: Record<string, string | undefined> = {}
let status = 200

vi.stubGlobal('defineNitroPlugin', (fn: unknown) => fn)
vi.stubGlobal('isCachedSsrRoute', isCachedSsrRoute)
vi.stubGlobal('getResponseStatus', () => status)
vi.stubGlobal('getResponseHeader', (_event: unknown, name: string) => responseHeaders[name])

const edgeCache = await import('../../../../server/utils/edgeCache')
for (const [name, value] of Object.entries(edgeCache)) vi.stubGlobal(name, value)
const { default: plugin } = await import('../../../../server/plugins/edge-cache')

const NITRO_SWR = 's-maxage=300, stale-while-revalidate'

let onRequest: (event: unknown) => void
plugin({ hooks: { hook: (name: string, fn: (event: unknown) => void) => { if (name === 'request') onRequest = fn } } } as any)

/** Run the request hook, then end the response the way h3 does. */
function respond(path: string, options: { method?: string, tenant?: object | null, headersSent?: boolean } = {}) {
  const ended = vi.fn()
  const res = {
    headersSent: options.headersSent ?? false,
    setHeader: (name: string, value: string) => { responseHeaders[name] = value },
    end: ended,
  }
  const event = {
    path,
    method: options.method ?? 'GET',
    context: { tenant: options.tenant === undefined ? { schemaName: 'demo' } : options.tenant },
    node: { res },
  }
  onRequest(event)
  res.end('<html>')
  expect(ended).toHaveBeenCalledWith('<html>')
  return responseHeaders
}

describe('edge-cache plugin', () => {
  beforeEach(() => {
    status = 200
    responseHeaders = { 'cache-control': NITRO_SWR, 'content-type': 'text/html;charset=utf-8' }
  })

  it('marks a cached page for the edge, tags it, and tells browsers to revalidate', () => {
    expect(respond('/products/12/phone')).toMatchObject({
      'cache-control': 'no-cache',
      'cloudflare-cdn-cache-control': 'max-age=60, stale-while-revalidate=86400',
      'cache-tag': 'storefront-html,storefront-html-demo',
    })
  })

  it('never uses s-maxage at the edge, which would disable stale-while-revalidate', () => {
    expect(respond('/')['cloudflare-cdn-cache-control']).not.toMatch(/s-maxage/)
  })

  it('marks the page payload a client navigation fetches', () => {
    responseHeaders['content-type'] = 'application/json'
    expect(respond('/blog/_payload.json?_b=abc')['cache-tag']).toBe('storefront-html,storefront-html-demo')
  })

  it('replaces the headers of the 304 h3 sends itself on a revalidation', () => {
    status = 304
    responseHeaders = { 'cache-control': 'public, max-age=300, s-maxage=300' }
    expect(respond('/')).toMatchObject({
      'cache-control': 'no-cache',
      'cloudflare-cdn-cache-control': 'max-age=60, stale-while-revalidate=86400',
    })
  })

  it.each([
    ['an uncached page (account, checkout)', '/account', {}],
    ['a response that did not come from Nitro\'s page cache', '/', { 'cache-control': undefined }],
    ['markdown served on a page URL', '/products', { 'content-type': 'text/markdown; charset=utf-8' }],
    ['an API response with its own SWR cache', '/api/products', {}],
  ])('leaves %s without an edge directive', (_label, path, overrides) => {
    Object.assign(responseHeaders, overrides)
    expect(respond(path)['cloudflare-cdn-cache-control']).toBeUndefined()
  })

  it('leaves errors, non-GET requests and tenant-less requests alone', () => {
    status = 404
    expect(respond('/')['cloudflare-cdn-cache-control']).toBeUndefined()
    status = 200
    expect(respond('/', { method: 'POST' })['cloudflare-cdn-cache-control']).toBeUndefined()
    expect(respond('/', { tenant: null })['cloudflare-cdn-cache-control']).toBeUndefined()
  })

  it('does not touch a response whose headers are already sent', () => {
    expect(respond('/', { headersSent: true })['cache-control']).toBe(NITRO_SWR)
  })
})
