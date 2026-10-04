import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/blog/posts/index.get'
import { backend, cacheOptionsOf, callRoute, createTestEvent } from '~~/test/helpers/nitro'
import { makeBlogPost } from '~~/test/fixtures/blog'

/**
 * GET /api/blog/posts: the blog's post lists, cached per store. The cache
 * key is the contract: Nitro serves one entry to every request with the
 * same key, so a parameter Django filters on that is missing from the key
 * serves one list under another's name (the blog index showing a search's
 * results, an author page showing the featured posts).
 */

const route = '/api/blog/posts'

const keyFor = (query: string, host = 'shop.test') =>
  cacheOptionsOf(handler).getKey!(createTestEvent({ host, url: `${route}${query}`, context: { locale: 'el' } }))

const page = (...posts: ReturnType<typeof makeBlogPost>[]) => ({
  links: { next: null, previous: null },
  count: posts.length,
  totalPages: 1,
  pageSize: 10,
  pageTotalResults: posts.length,
  page: 1,
  results: posts,
})

describe('GET /api/blog/posts cache key', () => {
  // Each of these changes what Django returns, so each must change the key.
  it.each([
    ['search', '?search=ανάκτηση'],
    ['featured', '?featured=true'],
    ['category', '?category=3'],
    ['tags', '?tags=4'],
    ['author', '?author=2'],
    ['id', '?id=9'],
    ['slug', '?slug=summer-news'],
    ['page', '?page=2'],
    ['pageSize', '?pageSize=24'],
    ['ordering', '?ordering=-viewCount'],
    ['cursor', '?cursor=cj0xJnA9MjAyNg'],
    ['paginationType', '?paginationType=cursor'],
    ['languageCode', '?languageCode=en'],
  ])('differs when only %s differs', (_name, query) => {
    expect(keyFor(query)).not.toBe(keyFor(''))
  })

  it('tells two values of the same filter apart', () => {
    expect(keyFor('?category=3')).not.toBe(keyFor('?category=4'))
    expect(keyFor('?author=2')).not.toBe(keyFor('?author=3'))
    expect(keyFor('?search=a')).not.toBe(keyFor('?search=b'))
  })

  it('tells a filter from the same text inside another\'s value', () => {
    // `search=a&category=2` as a value must not collide with two parameters.
    expect(keyFor('?search=a%26category%3D2')).not.toBe(keyFor('?search=a&category=2'))
  })

  it('does not depend on the order the parameters were written in', () => {
    expect(keyFor('?category=3&author=2&page=2')).toBe(keyFor('?page=2&author=2&category=3'))
  })

  it('keeps a list of tags together, apart from a single value that looks like one', () => {
    expect(keyFor('?tags=1&tags=2')).not.toBe(keyFor('?tags=1'))
    expect(keyFor('?tags=1&tags=2')).not.toBe(keyFor('?tags=12'))
    expect(keyFor('?tags=1&tags=2')).not.toBe(keyFor('?tags=1%2C2'))
  })

  it('ignores a parameter the route does not forward, so it cannot fragment the cache', () => {
    expect(keyFor('?utm_source=newsletter')).toBe(keyFor(''))
  })

  it('stays per store', () => {
    expect(keyFor('?category=3', 'store-a.test')).not.toBe(keyFor('?category=3', 'store-b.test'))
  })
})

describe('GET /api/blog/posts', () => {
  it('forwards every filter to Django', async () => {
    backend.reply(page(makeBlogPost()))

    await callRoute(handler, {
      route,
      url: `${route}?search=sale&featured=true&category=3&tags=4&author=2&page=2&pageSize=6&ordering=-viewCount`,
    })

    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/blog/post')
    expect(backend.lastRequest.query).toEqual({
      search: 'sale',
      featured: 'true',
      category: '3',
      tags: '4',
      author: '2',
      page: '2',
      pageSize: '6',
      ordering: '-viewCount',
      // The schema's own defaults.
      pagination: 'true',
      paginationType: 'pageNumber',
      languageCode: 'el',
    })
  })

  it('sends the cards, not the post bodies', async () => {
    const post = makeBlogPost({ translations: { el: { title: 'Τίτλος', subtitle: '', body: '<p>Πολύ μεγάλο κείμενο</p>' } } })
    backend.reply(page(post))

    const response = await callRoute(handler, { route, url: route })

    expect(response.body.results[0].translations.el).toEqual({ title: 'Τίτλος', subtitle: '' })
  })
})
