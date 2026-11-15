import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/blog/comments/index.get'
import { backend, callRoute } from '~~/test/helpers/nitro'
import { makeBlogComment } from '~~/test/fixtures/blog'

/**
 * GET /api/blog/comments: a page of comments as Django answers it. A
 * comment outlives its author's account (Django's `user` is SET_NULL), and
 * Django then sends `user: null`; one such comment used to answer the whole
 * page with a 422.
 */
const route = '/api/blog/comments'

describe('GET /api/blog/comments', () => {
  it('answers a page holding a comment by a deleted account', async () => {
    const comments = [makeBlogComment({ id: 1, user: null }), makeBlogComment({ id: 2 })]
    backend.reply({
      links: { next: null, previous: null },
      count: 2,
      totalPages: 1,
      pageSize: 10,
      pageTotalResults: 2,
      page: 1,
      results: comments,
    })

    const response = await callRoute(handler, { route, url: `${route}?post=3` })

    expect(response.status).toBe(200)
    expect(response.body.results.map((comment: { user: { id: number } | null }) => comment.user?.id ?? null)).toEqual([null, 1])
  })
})
