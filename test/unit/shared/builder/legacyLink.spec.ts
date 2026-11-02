import { describe, expect, it } from 'vitest'
import { parseLegacyLink } from '~~/shared/builder/legacyLink'

const ref = (kind: string, id: number | string) => ({ link: { ref: { kind, id } } })

describe('parseLegacyLink', () => {
  it.each([
    ['https://example.com/a?b=1#c', { link: { href: 'https://example.com/a?b=1#c' } }],
    ['  https://example.com  ', { link: { href: 'https://example.com' } }],
    // An https URL is external whatever its host: nothing says it is the store's own.
    ['https://shop.example/products/2/x', { link: { href: 'https://shop.example/products/2/x' } }],
  ])('keeps the external URL %j as an href', (raw, expected) => {
    expect(parseLegacyLink(raw)).toEqual(expected)
  })

  it.each(['/', '/products', '/blog', '/contact', '/offers', '/gift-cards', '/loyalty-program', '/feedback', '/account/login', '/account/signup'])(
    'reads the fixed route %s as a route',
    (route) => {
      expect(parseLegacyLink(route)).toEqual({ link: { route } })
    },
  )

  it.each([
    ['/products/2/mini-powerbank', ref('product', 2)],
    ['/products/2', ref('product', 2)],
    ['/products/category/3/powerbank', ref('category', 3)],
    ['/products/category/3', ref('category', 3)],
    // The slug is ignored: the same product has a different slug on staging and on production.
    ['/products/2/mini-power-bank-5000mah-tsephs-me-o8onh-lcd-black', ref('product', 2)],
    ['/blog/post/4/guide', ref('blogPost', 4)],
    ['/blog/category/5/news', ref('blogCategory', 5)],
    // A hierarchical blog category path still names the category by its id.
    ['/blog/category/5/news/local', ref('blogCategory', 5)],
    ['/info/faq', ref('contentPage', 'faq')],
    ['/privacy-policy', ref('contentPage', 'privacy')],
    ['/terms-of-use', ref('contentPage', 'terms')],
    ['/cookies-policy', ref('contentPage', 'cookies')],
    ['/return-policy', ref('contentPage', 'return-policy')],
    ['/about', ref('page', 'about')],
    ['/vision', ref('page', 'vision')],
    ['/spring-sale', ref('page', 'spring-sale')],
  ])('reads %s as the record it names', (path, expected) => {
    expect(parseLegacyLink(path)).toEqual(expected)
  })

  it.each([
    ['/en/products/2/mini-powerbank', ref('product', 2)],
    ['/en/products', { link: { route: '/products' } }],
    ['/en', { link: { route: '/' } }],
    ['/en/info/faq', ref('contentPage', 'faq')],
    ['/el/blog/post/4/guide', ref('blogPost', 4)],
    ['/en/spring-sale', ref('page', 'spring-sale')],
    ['/products/2/mini-powerbank/', ref('product', 2)],
  ])('ignores the locale prefix and a trailing slash: %s', (path, expected) => {
    expect(parseLegacyLink(path)).toEqual(expected)
  })

  it.each([
    ['', 'neither an https:// URL nor a path of the store'],
    ['products', 'neither an https:// URL nor a path of the store'],
    ['http://example.com', 'neither an https:// URL nor a path of the store'],
    ['mailto:a@b.c', 'neither an https:// URL nor a path of the store'],
    ['//example.com/x', 'not a route of the store that a link can name'],
    ['/products?ordering=newest', 'query string or an anchor'],
    ['/about#team', 'query string or an anchor'],
    ['/products/0/x', 'no record has'],
    ['/products/99999999999/x', 'no record has'],
    ['/some/deep/path', 'not a route of the store that a link can name'],
    ['/cart', 'not a route of the store that a link can name'],
    ['/search', 'not a route of the store that a link can name'],
    ['/api/products', 'not a route of the store that a link can name'],
    ['/info/two/segments', 'not a route of the store that a link can name'],
    ['/Mixed-Case', 'not a route of the store that a link can name'],
  ])('refuses %j instead of keeping it as text', (raw, reason) => {
    const parsed = parseLegacyLink(raw)

    expect(parsed).toEqual({ error: expect.stringContaining(reason) })
  })
})
