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

  const mount = (comments = COMMENTS) => mountSuspended(C, {
    route: false,
    props: { comments, displayImageOf: 'user' },
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

  it('keeps the order of a list that is all the reader own comments', async () => {
    session.loggedIn = true
    session.userId = 7
    const all = [4, 3, 2].map(id => makeBlogComment({ id, user: { ...makeBlogComment().user, id: 7 } }))

    expect(order(await mount(all))).toEqual(['4', '3', '2'])
  })

  it('puts all of the reader comments first and keeps the others in their order', async () => {
    session.loggedIn = true
    session.userId = 7
    const mixed = [5, 4, 3, 2, 1].map(id => makeBlogComment({ id, user: { ...makeBlogComment().user, id: id % 2 ? 7 : 9 } }))

    expect(order(await mount(mixed))).toEqual(['5', '3', '1', '4', '2'])
  })
})

describe('useBlogCommentList before the browser has mounted', () => {
  it('sends the list as it came, whoever the reader is: the page is cached anonymously', () => {
    session.loggedIn = true
    session.userId = 9

    const { sortedComments, userHasCommented } = useBlogCommentList(COMMENTS)

    expect(sortedComments.value.map(comment => comment.id)).toEqual([1, 2, 3])
    expect(userHasCommented(COMMENTS[1]!)).toBe(false)
  })
})
