import { describe, expect, it } from 'vitest'
import handler from '~~/server/api/blog/comments/index.post'
import { backend, callRoute, testSession } from '~~/test/helpers/nitro'
import { makeBlogCommentDetail } from '~~/test/fixtures/blog'

/**
 * POST /api/blog/comments: creates a comment (or a reply) and answers it as
 * Django does. A reply's `parentComment.user` and `ancestorsPath[].user` are
 * the PUBLIC author (`id`, `username`, `firstName`, `lastName`,
 * `mainImagePath`: the same one a comment's own `user` has), never the
 * account. The generated schema declared them as the account, so a saved
 * reply answered 422 and the reader retried into duplicates.
 */
const route = '/api/blog/comments'
const reply = { post: 3, user: 9, parent: 1, translations: { el: { content: 'Απάντηση' } } }

const create = () => callRoute(handler, { route, method: 'POST', body: reply })

describe('POST /api/blog/comments', () => {
  it('answers a reply whose parent and ancestors carry the public author', async () => {
    testSession.set({ user: { id: 9 }, secure: { accessToken: 'knox-1' } })
    const created = makeBlogCommentDetail({ id: 5 })
    backend.reply(created)

    const response = await create()

    expect(response.status).toBe(200)
    expect(response.body.parentComment.user).toEqual(created.parentComment!.user)
    expect(response.body.ancestorsPath[0].user).toEqual(created.ancestorsPath[0]!.user)
    expect(backend.lastRequest.path).toBe('http://backend.test/api/v1/blog/comment')
    expect(backend.lastRequest.headers.get('authorization')).toBe('Bearer knox-1')
  })
})
