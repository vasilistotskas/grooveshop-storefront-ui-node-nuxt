/**
 * The request a cached page route is answered for loses its ad tags, in
 * every place Nitro reads its URL from; any other request keeps them.
 * Real h3 events and the real route list (`isCachedSsrRoute`).
 */
import { describe, expect, it } from 'vitest'
import { stripTrackingParamsFromCachedRoute } from '~~/server/utils/trackingParams'
import { createTestEvent } from '~~/test/helpers/nitro'

function urlsAfter(url: string, method?: string) {
  const event = createTestEvent({ url, method })
  // h3 records the arrival URL before any layer runs.
  event.node.req.originalUrl = url
  stripTrackingParamsFromCachedRoute(event)
  return { path: event.path, url: event.node.req.url, originalUrl: event.node.req.originalUrl }
}

describe('stripTrackingParamsFromCachedRoute', () => {
  it.each([
    ['/?gclid=a', '/'],
    ['/products?gclid=a', '/products'],
    ['/products?sort=price&gclid=a', '/products?sort=price'],
    ['/products/12/phone?fbclid=a&page=2', '/products/12/phone?page=2'],
    ['/en/blog?utm_source=x', '/en/blog'],
    ['/about?utm_medium=cpc', '/about'],
    ['/info/shipping?gclid=a', '/info/shipping'],
    ['/products/_payload.json?gclid=a&_b=1', '/products/_payload.json?_b=1'],
  ])('answers %s as %s', (url, clean) => {
    expect(urlsAfter(url)).toEqual({ path: clean, url: clean, originalUrl: clean })
  })

  it.each([
    // Rendered per request, never shared: nothing to gain, and a click
    // id on a redirect or the cart is the visitor's own.
    '/cart?gclid=a',
    '/account/login?gclid=a&next=%2Faccount',
    '/home?gclid=a',
    '/api/products/search?utm_source=x',
    '/_nuxt/entry.js?gclid=a',
    // No tag, no change.
    '/products?page=2',
    '/products',
  ])('leaves %s as it was', (url) => {
    expect(urlsAfter(url)).toEqual({ path: url, url, originalUrl: url })
  })

  it.each(['POST', 'PUT', 'DELETE'])('leaves a %s alone', (method) => {
    expect(urlsAfter('/products?gclid=a', method).path).toBe('/products?gclid=a')
  })

  it('serves a HEAD like a GET', () => {
    expect(urlsAfter('/products?gclid=a', 'HEAD').path).toBe('/products')
  })
})
