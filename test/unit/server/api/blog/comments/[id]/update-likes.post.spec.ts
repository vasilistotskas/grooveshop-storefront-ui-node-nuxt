import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/blog/comments/[id]/update-likes.post'
import { backend, callRoute, testSession } from '~~/test/helpers/nitro'
import { makeBlogCommentDetail } from '~~/test/fixtures/blog'

/**
 * POST /api/blog/comments/:id/update-likes: answers the comment as Django
 * reads it, here a reply of a reply, whose two ancestors and parent carry
 * the public author (see `index.post.spec.ts`).
 */
const route = '/api/blog/comments/9/update-likes'

describe('POST /api/blog/comments/:id/update-likes', () => {
  it('answers a reply of a reply with its ancestors\' public authors', async () => {
    testSession.set({ user: { id: 9 }, secure: { accessToken: 'knox-1' } })
    const author = (id: number) => ({ id, username: `user${id}`, firstName: 'Μαρία', lastName: 'Ιωάννου', mainImagePath: '' })
    const nested = makeBlogCommentDetail({
      id: 9,
      parent: 5,
      parentComment: { id: 5, contentPreview: 'Σχόλιο 5', user: author(5), createdAt: '2026-01-01T00:00:00Z' },
      ancestorsPath: [
        { id: 1, contentPreview: 'Σχόλιο 1', user: author(1) },
        { id: 5, contentPreview: 'Σχόλιο 5', user: author(5) },
      ],
    })
    backend.reply(nested)

    const response = await callRoute(handler, { route: '/api/blog/comments/:id/update-likes', url: route, method: 'POST' })

    expect(response.status).toBe(200)
    expect(response.body.ancestorsPath.map((ancestor: { user: { id: number } }) => ancestor.user.id)).toEqual([1, 5])
    expect(response.body.parentComment.user.id).toBe(5)
  })
})
