import { describe, expect, it } from 'vitest'
import middleware from '~~/server/middleware/0.request-id'
import { callHandler, createRequestEvent, createTestEvent } from '~~/test/helpers/nitro'

/**
 * The id evlog gives a request, back to the caller on `/api` only. A page
 * can be replayed from a shared cache, and an id belongs to one request.
 * (The cache and error-handler behaviour is test/e2e/requestId.ts.)
 */
async function headerFor(url: string, requestId: unknown = 'req-1') {
  const event = createTestEvent({ url })
  event.context.log = { getContext: () => ({ requestId }) } as never
  await callHandler(middleware, event)
  return event.node.res.getHeader('x-request-id')
}

describe('server/middleware/0.request-id', () => {
  it('returns the request id on an /api response', async () => {
    expect(await headerFor('/api/cart', 'abc-123')).toBe('abc-123')
  })

  it('returns it on the bare /api too, which evlog answers as an API path', async () => {
    expect(await headerFor('/api', 'abc-123')).toBe('abc-123')
  })

  it.each([['/apix'], ['/api-docs'], ['/'], ['/products'], ['/_nuxt/entry.js'], ['/en/blog']])('puts none on %s, a page or an asset that a shared cache replays', async (url) => {
    expect(await headerFor(url)).toBeUndefined()
  })

  it.each([[''], [42], [null]])('puts none when the request has no usable id (%s)', async (id) => {
    expect(await headerFor('/api/cart', id)).toBeUndefined()
  })

  it('does not throw before evlog has given the request a logger', async () => {
    const event = createRequestEvent({ url: '/api/cart' })
    event.context.log = undefined

    await expect(callHandler(middleware, event as never)).resolves.toBeUndefined()
  })
})
