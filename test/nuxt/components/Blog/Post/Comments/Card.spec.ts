import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import BlogPostCommentsCard from '~/components/Blog/Post/Comments/Card.vue'
import WebsideBlogPostCommentsCard from '~/components/variants/webside/Blog/Post/Comments/Card.vue'
import { makeBlogComment } from '~~/test/fixtures/blog'
import { failWith } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'

/**
 * One comment: its replies load on demand with the reader's like state,
 * and a signed-in reader answers it. A failed load or a refused reply is
 * one toast, and the card stays usable — a refused load used to leave
 * the replies spinner up with nothing said.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The full surface: the app's auth plugin reads it at boot.
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockNuxtImport('useRoute', () => () => ({
  params: { id: '42', slug: 'post' },
  query: {},
  path: '/blog/post/42/post',
  fullPath: '/blog/post/42/post',
  name: 'blog-post-id-slug___el',
  hash: '',
  matched: [],
  meta: {},
}))

// The avatar and the reply form are rendered `Lazy…` (a direct async
// import no stub key matches), so their modules are mocked; the form is
// one button submitting a fixed reply.
const { FormStub, NoopStub } = await vi.hoisted(async () => {
  const { defineComponent, h } = await import('vue')
  return {
    FormStub: defineComponent({
      emits: ['submit'],
      setup: (_, { emit }) => () => h('button', { 'data-test': 'send-reply', 'onClick': () => emit('submit', { content: 'Νέα απάντηση' }) }),
    }),
    NoopStub: defineComponent({ render: () => null }),
  }
})
vi.mock('~/components/DynamicForm/index.vue', () => ({ default: FormStub }))
vi.mock('~/components/User/Avatar.vue', () => ({ default: NoopStub }))

const COMMENT = makeBlogComment({ id: 1, hasReplies: true, repliesCount: 2 })
const REPLIES = '/api/blog/comments/1/replies'
const replyPage = {
  count: 2,
  links: { next: null, previous: null },
  results: [makeBlogComment({ id: 5, isReply: true, parent: 1 }), makeBlogComment({ id: 6, isReply: true, parent: 1 })],
}

describe.each(trees(BlogPostCommentsCard, WebsideBlogPostCommentsCard))('$tree Blog/Post/Comments/Card', ({ own, C }) => {
  beforeEach(() => {
    // The comment list seeds the page's cursor state before any card mounts.
    useState<CursorState>('cursor-state').value = generateInitialCursorState()
    useUserStore().blogLikedComments = []
  })

  const mount = () => mountSuspended(C, {
    route: false,
    props: { comment: COMMENT, displayImageOf: 'user' },
    global: {
      stubs: {
        [own('BlogPostCommentsCard')]: { props: ['comment'], template: '<div data-reply />' },
        [own('ButtonBlogCommentLike')]: true,
        [own('Pagination')]: true,
      },
    },
  })
  type Wrapper = Awaited<ReturnType<typeof mount>>
  const showReplies = async (wrapper: Wrapper) => {
    await wrapper.findAll('button').find(b => b.text() === '2 Απαντήσεις')!.trigger('click')
    await flushPromises()
  }

  it('shows the replies and the reader\'s like state for them', async () => {
    api.routes({ [REPLIES]: replyPage, '/api/blog/comments/liked-comments': { likedCommentIds: [5] } })
    const wrapper = await mount()

    await showReplies(wrapper)

    expect(wrapper.findAll('[data-reply]')).toHaveLength(2)
    expect(api.callsTo('/api/blog/comments/liked-comments').map(call => call.options.body)).toEqual([{ commentIds: [5, 6] }])
    expect(useUserStore().blogLikedComments).toEqual([5])
  })

  it('says so when the replies cannot be loaded, and offers them again', async () => {
    api.routes({ [REPLIES]: failWith(502) })
    const wrapper = await mount()

    await showReplies(wrapper)

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Σφάλμα φόρτωσης απαντήσεων', color: 'error' })
    expect(wrapper.findAll('[data-reply]')).toHaveLength(0)
    const retry = wrapper.findAll('button').find(b => b.text() === '2 Απαντήσεις')!
    expect(retry.attributes('disabled')).toBeUndefined()
  })

  it('posts a reply under the comment and shows it with the others', async () => {
    const created = makeBlogComment({ id: 9, isReply: true, parent: 1 })
    api.routes({ '/api/blog/comments': created, [REPLIES]: replyPage })
    const wrapper = await mount()

    await wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Απάντηση')!.trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find('[data-test="send-reply"]').exists()).toBe(true))
    await wrapper.get('[data-test="send-reply"]').trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/blog/comments')[0]!.options).toMatchObject({
      method: 'POST',
      body: { post: 42, user: 7, parent: 1, translations: { el: { content: 'Νέα απάντηση' } } },
    })
    expect(wrapper.emitted('reply-add')).toEqual([[created]])
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ color: 'success' }))
    expect(wrapper.findAll('[data-reply]')).toHaveLength(2)
  })

  it('keeps the form open and says so when the reply is refused', async () => {
    api.routes({ '/api/blog/comments': failWith(400) })
    const wrapper = await mount()

    await wrapper.findAll('button').find(b => b.attributes('aria-label') === 'Απάντηση')!.trigger('click')
    await vi.waitFor(() => expect(wrapper.find('[data-test="send-reply"]').exists()).toBe(true))
    await wrapper.get('[data-test="send-reply"]').trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Σφάλμα δημιουργίας σχολίου', color: 'error' })
    expect(wrapper.emitted('reply-add')).toBeUndefined()
    expect(wrapper.find('[data-test="send-reply"]').exists()).toBe(true)
  })
})
