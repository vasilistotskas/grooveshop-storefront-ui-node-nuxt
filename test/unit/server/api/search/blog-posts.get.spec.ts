import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/search/blog-posts.get'
import { zBlogPostMeiliSearchResponse } from '~~/shared/openapi/zod.gen'
import { backend, callRoute } from '~~/test/helpers/nitro'

/**
 * GET /api/search/blog-posts: the blog post search, paged on its own so
 * the search page's guides do not follow the page of products.
 */

const route = '/api/search/blog-posts'

const page = {
  queryId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  relaxedQuery: null,
  limit: 3,
  offset: 0,
  estimatedTotalHits: 1,
  results: [{
    id: 4,
    languageCode: 'el',
    title: 'Τι σημαίνουν τα mAh',
    subtitle: '',
    body: '',
    master: 4,
    slug: 'ti-simainoun-ta-mah',
    mainImagePath: '',
    matchesPosition: null,
    rankingScore: null,
    formatted: null,
    contentType: 'blog_post',
  }],
}

describe('GET /api/search/blog-posts', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zBlogPostMeiliSearchResponse.safeParse(page).success).toBe(true)
  })

  it('forwards the query and paging under Django\'s names and returns the parsed page', async () => {
    backend.reply(page)

    const response = await callRoute(handler, { route, url: `${route}?query=power%20bank&languageCode=el&limit=3&offset=6` })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(page)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/search/blog/post')
    expect(backend.lastRequest.query).toEqual({ query: 'power bank', language_code: 'el', limit: '3', offset: '6' })
  })

  it.each([
    ['no query', 'languageCode=el'],
    ['a non-integer limit', 'query=x&limit=ten'],
  ])('answers 400 for %s without calling the backend', async (_label, query) => {
    const response = await callRoute(handler, { route, url: `${route}?${query}` })

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
