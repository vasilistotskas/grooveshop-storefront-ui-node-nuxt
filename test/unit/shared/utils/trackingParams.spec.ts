/**
 * What counts as an ad tag, and that removing one touches nothing else:
 * the other params keep their bytes and order, and a URL with no tag
 * comes back as the same string — the server keys its page cache on the
 * result, so a rewrite of an innocent URL would split its entry.
 */
import { describe, expect, it } from 'vitest'
import { CLICK_ID_PARAMS } from '~~/shared/constants/trackingParams'
import { isTrackingParam, withoutTrackingParams } from '~~/shared/utils/trackingParams'

describe('isTrackingParam', () => {
  it.each(Object.keys(CLICK_ID_PARAMS))('names the click id %s', (name) => {
    expect(isTrackingParam(name)).toBe(true)
  })

  it.each(['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'UTM_Source', 'gad_source'])('names the tag %s', (name) => {
    expect(isTrackingParam(name)).toBe(true)
  })

  // Every one of these changes what the page shows or where it goes.
  it.each(['page', 'sort', 'category', 'search', 'query', 'next', 'token', 'ordering', 'utm', 'my_utm_source'])('leaves %s alone', (name) => {
    expect(isTrackingParam(name)).toBe(false)
  })
})

describe('withoutTrackingParams', () => {
  it.each([
    ['/products?gclid=abc', '/products'],
    ['/products?fbclid=1&utm_source=x&utm_medium=cpc', '/products'],
    ['/products?sort=price&gclid=abc', '/products?sort=price'],
    ['/products?gclid=abc&sort=price', '/products?sort=price'],
    ['/products?page=2&gclid=a&sort=price&utm_campaign=b', '/products?page=2&sort=price'],
    ['/en?msclkid=z', '/en'],
    ['/blog?gclid=a&gclid=b&page=3', '/blog?page=3'],
    // A name that is escaped is still the name.
    ['/products?utm%5Fsource=x&page=2', '/products?page=2'],
    ['/products?gclid&page=2', '/products?page=2'],
    ['/products?gclid=&page=2', '/products?page=2'],
  ])('%s → %s', (url, expected) => {
    expect(withoutTrackingParams(url)).toBe(expected)
  })

  it('keeps every other param byte for byte', () => {
    const url = '/products?search=%CE%B1%20b+c&price=1,2&brand[]=x&gclid=1&q=%zz'

    expect(withoutTrackingParams(url)).toBe('/products?search=%CE%B1%20b+c&price=1,2&brand[]=x&q=%zz')
  })

  it.each([
    '/products',
    '/products?',
    '/products?page=2',
    '/products?page=2&&sort=price',
    '/products?utm=1&gclid_x=2&xgclid=3',
    '/products?%zz=1',
  ])('returns %s as the same string when it has no tag', (url) => {
    expect(withoutTrackingParams(url)).toBe(url)
  })

  it('gives two URLs that differ only in their tags the same result', () => {
    expect(withoutTrackingParams('/products?sort=price&gclid=a&utm_source=x'))
      .toBe(withoutTrackingParams('/products?utm_source=y&sort=price&fbclid=b'))
  })
})
