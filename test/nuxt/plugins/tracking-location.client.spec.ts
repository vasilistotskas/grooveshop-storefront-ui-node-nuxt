import { beforeEach, describe, expect, it } from 'vitest'
import trackingLocation from '~/plugins/tracking-location.client'

/**
 * The server renders a cached page without the visitor's ad tags and says
 * so in `payload.path`. Nuxt's router starts from a rendered path that has
 * a query of its own and replaces the address bar with it, which would
 * drop the click id before a consent-gated pixel reads it. The plugin
 * hands the router the real URL — only when the real URL is the rendered
 * one plus tags.
 */
const run = (renderedPath: string | undefined) => {
  const nuxtApp = { payload: { path: renderedPath } }
  ;(trackingLocation as unknown as (app: typeof nuxtApp) => void)(nuxtApp)
  return nuxtApp.payload.path
}

const visit = (url: string) => window.history.replaceState(null, '', url)

describe('tracking-location plugin', () => {
  beforeEach(() => visit('/'))

  it('is ordered before the router, which reads the path while it sets up', () => {
    // `enforce: 'pre'` is -20, the router's own.
    expect((trackingLocation as unknown as { order: number }).order).toBeLessThan(-20)
  })

  it.each([
    ['/products?sort=price&gclid=x', '/products?sort=price'],
    ['/products?gclid=x&sort=price', '/products?sort=price'],
    ['/en/blog?page=2&utm_source=a&fbclid=b', '/en/blog?page=2'],
    // A bare rendered path: the router appends the browser's query by
    // itself, and the plugin agrees with it.
    ['/products?gclid=x', '/products'],
    ['/?utm_medium=cpc', '/'],
    ['/products?search=%CE%B1%20b&gclid=x', '/products?search=%CE%B1%20b'],
  ])('keeps %s when the server rendered %s', (landing, rendered) => {
    visit(landing)

    expect(run(rendered)).toBe(landing)
  })

  it.each([
    // Not a tagged URL: nothing to keep.
    ['/products?sort=price', '/products?sort=price'],
    ['/products', '/products'],
    // The server rendered another page, or another query: Nuxt decides.
    ['/products?sort=price&gclid=x', '/blog'],
    ['/products?sort=price&gclid=x', '/products?sort=name'],
    ['/products?sort=price&gclid=x', '/products?sort=price&gclid=x'],
  ])('leaves the rendered path alone for %s rendered as %s', (landing, rendered) => {
    visit(landing)

    expect(run(rendered)).toBe(rendered)
  })

  it('does nothing without a rendered path', () => {
    visit('/products?gclid=x')

    expect(run(undefined)).toBeUndefined()
  })
})
