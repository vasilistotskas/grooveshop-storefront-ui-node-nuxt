import memoryDriver from 'unstorage/drivers/memory'
import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/blog/posts/[id]/update-view-count.post'
import { zBlogPostDetail } from '~~/shared/openapi/zod.gen'
import { backend, callRoute, testSession, useStorage } from '~~/test/helpers/nitro'

/**
 * POST /api/blog/posts/[id]/update-view-count: counts a post view once
 * per session, behind a per-IP limit of 10 a minute kept in the cache
 * storage (Redis in production).
 */

const route = '/api/blog/posts/:id/update-view-count'
const TIMESTAMP = '2026-01-01T00:00:00Z'

const postDetail = {
  id: 3,
  uuid: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
  slug: 'summer-news',
  likes: [],
  translations: {},
  author: {
    translations: {},
    id: 1,
    uuid: '1b4e28ba-2fa1-41d2-883f-0016d3cca427',
    user: { id: 1, username: null, firstName: '', lastName: '', mainImagePath: '' },
    website: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    numberOfPosts: 1,
    totalLikesReceived: 0,
    recentPosts: [],
    topPosts: [],
  },
  category: {
    id: 1,
    translations: {},
    slug: 'news',
    level: 0,
    sortOrder: null,
    postCount: 1,
    hasChildren: false,
    mainImagePath: '',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    children: [],
    ancestors: [],
    siblingsCount: 0,
    descendantsCount: 0,
    recursivePostCount: 1,
    categoryPath: 'news',
    treeId: 1,
    uuid: '6a2f41a3-c54c-4fce-8e63-4a7a3b1c5a4e',
  },
  tags: [],
  viewCount: 8,
  likesCount: 0,
  commentsCount: 0,
  tagsCount: 0,
  publishedAt: null,
  createdAt: TIMESTAMP,
  updatedAt: TIMESTAMP,
  mainImagePath: '',
  readingTime: 1,
  contentPreview: '',
  userHasLiked: false,
}

const view = (id = '3', ip = '203.0.113.9') => callRoute(handler, {
  route,
  url: `/api/blog/posts/${id}/update-view-count`,
  method: 'POST',
  headers: { 'cf-connecting-ip': ip },
})

describe('POST /api/blog/posts/[id]/update-view-count', () => {
  it('uses a response fixture the generated schema accepts', () => {
    expect(zBlogPostDetail.safeParse(postDetail).success).toBe(true)
  })

  it('counts the view at Django and remembers it in the session', async () => {
    backend.reply(postDetail)

    const response = await view()

    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({ id: 3, viewCount: 8 })
    expect(backend.lastRequest.method).toBe('POST')
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/blog/post/3/update_view_count')
    expect(testSession.data.viewedPosts).toEqual(['3'])
  })

  it('does not count a post twice in one session', async () => {
    testSession.set({ viewedPosts: ['3'] })

    const response = await view()

    expect(response.body).toBeUndefined()
    expect(backend.requests).toEqual([])
  })

  it('refuses the eleventh view from one IP within the window', async () => {
    await useStorage('cache').setItem('rate:view-count:203.0.113.9', 10)

    const response = await view()

    expect(response.status).toBe(429)
    expect(backend.requests).toEqual([])
  })

  it('counts each IP against its own budget, for a minute from the last hit', async () => {
    const ttls: unknown[] = []
    const memory = memoryDriver()
    useStorage().mount('cache', {
      ...memory,
      setItem(key, value, options) {
        ttls.push(options?.ttl)
        return memory.setItem!(key, value, options)
      },
    })
    await useStorage('cache').setItem('rate:view-count:203.0.113.9', 10)
    ttls.length = 0
    backend.reply(postDetail)

    const response = await view('3', '198.51.100.7')

    expect(response.status).toBe(200)
    expect(await useStorage('cache').getItem('rate:view-count:198.51.100.7')).toBe(1)
    expect(ttls).toEqual([60])
  })

  it('rejects a non-numeric post id', async () => {
    const response = await view('abc')

    expect(response.status).toBe(400)
    expect(backend.requests).toEqual([])
  })
})
