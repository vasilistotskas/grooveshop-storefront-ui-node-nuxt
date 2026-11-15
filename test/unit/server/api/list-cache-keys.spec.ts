import { describe, expect, it } from 'vitest'
import authors from '~~/server/api/blog/authors/index.get'
import categories from '~~/server/api/blog/categories/index.get'
import comments from '~~/server/api/blog/comments/index.get'
import postComments from '~~/server/api/blog/posts/[id]/comments.get'
import posts from '~~/server/api/blog/posts/index.get'
import tags from '~~/server/api/blog/tags/index.get'
import contentPages from '~~/server/api/content-pages/index.get'
import countries from '~~/server/api/countries/index.get'
import regions from '~~/server/api/regions/index.get'
import {
  zListBlogAuthorQuery,
  zListBlogCategoryQuery,
  zListBlogCommentQuery,
  zListBlogPostCommentsQuery,
  zListBlogPostQuery,
  zListBlogTagQuery,
  zListContentPageQuery,
  zListCountryQuery,
  zListRegionQuery,
} from '~~/shared/openapi/zod.gen'
import { cacheOptionsOf, createTestEvent } from '~~/test/helpers/nitro'

/**
 * A cached list route's key is built from exactly the query the route
 * validates and forwards. Nitro serves one entry to every request with the
 * same key, so a forwarded parameter missing from the key serves one list
 * under another's name: a post's comments read at `page=2` came back as
 * page 1 (the "load more" that never loaded), and a key built from a
 * parameter the route drops fragments the cache for nothing.
 */
const ROUTES = [
  ['/api/blog/authors', authors, zListBlogAuthorQuery],
  ['/api/blog/categories', categories, zListBlogCategoryQuery],
  ['/api/blog/comments', comments, zListBlogCommentQuery],
  ['/api/blog/posts/7/comments', postComments, zListBlogPostCommentsQuery],
  ['/api/blog/posts', posts, zListBlogPostQuery],
  ['/api/blog/tags', tags, zListBlogTagQuery],
  ['/api/content-pages', contentPages, zListContentPageQuery],
  ['/api/countries', countries, zListCountryQuery],
  ['/api/regions', regions, zListRegionQuery],
] as const

const keyFor = (handler: (typeof ROUTES)[number][1], url: string) =>
  cacheOptionsOf(handler).getKey!(createTestEvent({ host: 'shop.test', url, context: { locale: 'el', params: { id: url.match(/posts\/(\d+)/)?.[1] ?? '' } } }))

describe.each(ROUTES)('%s cache key', (route, handler, schema) => {
  const parameters = Object.keys(schema.shape)

  it('differs when only any one forwarded parameter differs', () => {
    const same = parameters.filter(name => keyFor(handler, `${route}?${name}=1`) === keyFor(handler, route))

    expect(same, 'parameters the route forwards that the key ignores').toEqual([])
  })

  it('ignores a parameter the route does not forward', () => {
    expect(keyFor(handler, `${route}?utm_source=newsletter`)).toBe(keyFor(handler, route))
  })
})

describe('a post\'s comments cache key', () => {
  it('tells page 2 from page 1, and one post from another', () => {
    const key = (url: string) => keyFor(postComments, url)

    expect(key('/api/blog/posts/7/comments?page=2&pageSize=3')).not.toBe(key('/api/blog/posts/7/comments?page=1&pageSize=3'))
    expect(key('/api/blog/posts/7/comments?pageSize=3')).not.toBe(key('/api/blog/posts/8/comments?pageSize=3'))
  })
})
