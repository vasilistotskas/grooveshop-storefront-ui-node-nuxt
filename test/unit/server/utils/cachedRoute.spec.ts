import { describe, expect, it } from 'vitest'
import { defineCachedRoute } from '~~/server/utils/cachedRoute'
import { cacheOptionsOf, callRoute } from '~~/test/helpers/nitro'

/**
 * `defineCachedRoute` asserts one thing about types: that a `nuxt/server`
 * handler can be cached by Nitro 2, whose cache is typed on h3's event.
 * What makes that true is runtime behaviour, pinned here: the handler is
 * given the portable event, and Nitro's cache gets the options as written.
 */
describe('defineCachedRoute', () => {
  it('gives the handler the portable event: a web Request, a URL and the request context', async () => {
    const route = defineCachedRoute(event => ({
      method: event.req.method,
      varied: event.req.headers.get('x-probe'),
      unvaried: event.req.headers.get('x-other'),
      path: event.url.pathname,
      query: event.url.searchParams.get('page'),
      store: event.context.tenantHost,
      isRequest: event.req instanceof Request,
    }), { name: 'probe', varies: ['x-probe'] })

    const response = await callRoute(route, { url: '/api/probe?page=2', host: 'webside.gr', headers: { 'x-probe': 'yes', 'x-other': 'no' } })

    expect(response.body).toEqual({
      method: 'GET',
      // Nitro's cached handler sees only the headers it varies on.
      varied: 'yes',
      unvaried: null,
      path: '/api/probe',
      query: '2',
      store: 'webside.gr',
      isRequest: true,
    })
  })

  it('hands Nitro\'s cache the options as written', () => {
    const getKey = () => 'key'
    const route = defineCachedRoute(() => ({}), { name: 'probe', maxAge: 60, swr: true, getKey })

    expect(cacheOptionsOf(route)).toEqual({ name: 'probe', maxAge: 60, swr: true, getKey })
  })
})
