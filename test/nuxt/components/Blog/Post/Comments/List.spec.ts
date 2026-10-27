import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import CommentsList from '~/components/Blog/Post/Comments/List.vue'
import WebsideCommentsList from '~/components/variants/webside/Blog/Post/Comments/List.vue'
import { makeBlogComment } from '~~/test/fixtures/blog'
import { trees } from '~~/test/helpers/trees'

/**
 * A post's comment list (`useBlogCommentList`, both trees): the signed-in
 * reader's own comment comes first, and only theirs is marked as theirs.
 */
const session = vi.hoisted(() => ({ loggedIn: false, userId: null as number | null }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(session.loggedIn),
  user: ref(session.userId === null ? null : { id: session.userId }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

const COMMENTS = [
  makeBlogComment({ id: 1, user: { ...makeBlogComment().user, id: 7 } }),
  makeBlogComment({ id: 2, user: { ...makeBlogComment().user, id: 9 } }),
  makeBlogComment({ id: 3, user: { ...makeBlogComment().user, id: 7 } }),
]

describe.each(trees(CommentsList, WebsideCommentsList))('$tree Blog/Post/Comments/List', ({ C, own }) => {
  beforeEach(() => {
    session.loggedIn = false
    session.userId = null
  })

  const mount = () => mountSuspended(C, {
    route: false,
    props: { comments: COMMENTS, displayImageOf: 'user' },
    global: { stubs: { [own('BlogPostCommentsCard')]: { props: ['comment'], template: '<article :data-id="comment.id" />' } } },
  })
  const order = (wrapper: Awaited<ReturnType<typeof mount>>) => wrapper.findAll('article').map(card => card.attributes('data-id'))

  it('keeps the order it was given for a guest', async () => {
    expect(order(await mount())).toEqual(['1', '2', '3'])
  })

  it('puts the signed-in reader\'s own comment first', async () => {
    session.loggedIn = true
    session.userId = 9

    expect(order(await mount())).toEqual(['2', '1', '3'])
  })
})
