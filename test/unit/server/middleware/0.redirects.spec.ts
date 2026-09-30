import { describe, expect, it } from 'vitest'
import { getResponseHeader, getResponseStatus } from 'h3'
import middleware from '~~/server/middleware/0.redirects'
import { callHandler, createTestEvent } from '~~/test/helpers/nitro'

describe('server/middleware/0.redirects', () => {
  it('301s a www. host onto the bare host, keeping the path and query', async () => {
    const event = createTestEvent({ host: 'www.shop.test', url: '/products/3?x=1' })

    await callHandler(middleware, event)

    expect(getResponseStatus(event)).toBe(301)
    expect(getResponseHeader(event, 'location')).toBe('https://shop.test/products/3?x=1')
  })

  it.each([
    ['a bare host', { host: 'shop.test' }],
    ['a host that merely contains www.', { host: 'shop.www.test' }],
    // Only the Host decides; X-Forwarded-Host is client-supplied.
    ['a forwarded www. host', { host: 'shop.test', headers: { 'x-forwarded-host': 'www.shop.test' } }],
  ])('leaves %s alone', async (_label, req) => {
    const event = createTestEvent(req)

    await callHandler(middleware, event)

    expect(getResponseHeader(event, 'location')).toBeUndefined()
  })
})
