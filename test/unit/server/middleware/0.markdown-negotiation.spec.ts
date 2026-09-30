import { describe, expect, it, vi } from 'vitest'
import { getResponseHeader } from 'h3'
import middleware from '~~/server/middleware/0.markdown-negotiation'
import { callHandler, createTestEvent } from '~~/test/helpers/nitro'
import type { TestRequest } from '~~/test/helpers/nitro'

/**
 * `event.fetch` is Nitro's in-process local fetch — the one boundary
 * here, so each event gets a spy for it.
 */
function markdownRequest(req: TestRequest = {}, upstream: () => Promise<Response> = async () => new Response('# Markdown body')) {
  const event = createTestEvent({ url: '/products', ...req, headers: { accept: 'text/markdown', ...req.headers } })
  const fetch = vi.fn(upstream)
  event.fetch = fetch as unknown as typeof event.fetch
  return { event, fetch, result: callHandler(middleware, event) }
}

describe('server/middleware/0.markdown-negotiation', () => {
  it('leaves a request that does not ask for markdown alone', async () => {
    const { fetch, result } = markdownRequest({ headers: { accept: 'text/html' } })

    await expect(result).resolves.toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it.each([
    ['its own internal re-fetch', { headers: { 'x-md-negotiation-internal': '1' } }],
    ['a path with an extension', { url: '/robots.txt' }],
    ['an /api/ path', { url: '/api/products' }],
    ['a /checkout/ path', { url: '/checkout/success' }],
  ])('does not negotiate %s', async (_label, req) => {
    const { fetch, result } = markdownRequest(req)

    await expect(result).resolves.toBeUndefined()
    expect(fetch).not.toHaveBeenCalled()
  })

  it('re-fetches the .md mirror with the marker and the real Host, not X-Forwarded-Host', async () => {
    const { fetch, result } = markdownRequest({ headers: { 'x-forwarded-host': 'evil.example' } })

    await result

    expect(fetch).toHaveBeenCalledWith('/products.md', {
      headers: { 'x-md-negotiation-internal': '1', 'host': 'shop.test' },
    })
  })

  it.each([
    ['/', '/index.md'],
    ['/products/', '/products.md'],
  ])('maps %s to %s', async (url, mdPath) => {
    const { fetch, result } = markdownRequest({ url })

    await result

    expect(fetch).toHaveBeenCalledWith(mdPath, expect.anything())
  })

  it('answers with the markdown and headers that keep caches keyed by Accept', async () => {
    const { event, result } = markdownRequest()

    await expect(result).resolves.toBe('# Markdown body')
    expect(getResponseHeader(event, 'content-type')).toBe('text/markdown; charset=utf-8')
    expect(getResponseHeader(event, 'vary')).toBe('Accept')
    expect(getResponseHeader(event, 'cache-control')).toBe('public, max-age=300, stale-while-revalidate=3600')
  })

  it.each([
    ['the re-fetch fails', async () => {
      throw new Error('network error')
    }],
    ['the mirror is not ok', async () => new Response('Not found', { status: 404 })],
    ['the mirror is empty', async () => new Response('')],
  ])('falls through to the HTML route when %s', async (_label, upstream) => {
    const { event, result } = markdownRequest({}, upstream)

    await expect(result).resolves.toBeUndefined()
    expect(getResponseHeader(event, 'content-type')).toBeUndefined()
  })
})
