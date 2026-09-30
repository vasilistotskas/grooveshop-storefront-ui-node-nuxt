import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, defineComponent, h, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import BlogPostComments from '~/components/Blog/Post/Comments/index.vue'
import WebsideBlogPostComments from '~/components/variants/webside/Blog/Post/Comments/index.vue'
import type { ApiRouteHandler } from '~~/test/helpers/api'
import { trees } from '~~/test/helpers/trees'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { state, toastAdd } = vi.hoisted(() => ({
  state: {
    /** Merchant runtime settings; a missing key takes the caller's fallback. */
    flags: {} as Record<string, boolean>,
  },
  toastAdd: vi.fn(),
}))
const session = vi.hoisted(() => ({ loggedIn: undefined as any, user: undefined as any }))

mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => state.flags[key] ?? options.fallback))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  session.user ??= ref(null)
  return {
    loggedIn: session.loggedIn,
    user: session.user,
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

const PROXY_URL = '/api/blog/posts/42/comments'
// DRF's `request.build_absolute_uri()` — an absolute Django origin that must
// never be hit directly from the browser (H20).
const NEXT_PAGE_URL = 'https://api.webside.gr/api/v1/blog/post/42/comments'
  + '?cursor=Y3Vyc29yOjE%3D&pageSize=3&paginationType=cursor&languageCode=el&approved=true&parent_Isnull=true'

function comment(id: number, createdAt: string) {
  return {
    id,
    uuid: `uuid-${id}`,
    translations: { el: { content: `Σχόλιο ${id}` } },
    user: { pk: 1, id: 1, email: 'a@example.com' },
    contentPreview: `Σχόλιο ${id}`,
    isReply: false,
    parent: null,
    hasReplies: false,
    approved: true,
    isEdited: false,
    likesCount: 0,
    repliesCount: 0,
    userHasLiked: false,
    createdAt,
    updatedAt: createdAt,
  }
}

const page = (results: ReturnType<typeof comment>[], next: string | null = null) => ({
  count: results.length,
  links: { next, previous: null },
  results,
})

/**
 * The component's own `<i18n>` copy (el), which the global `$i18n.t`
 * cannot reach: the button labels are how a reader finds the actions.
 */
const COPY = {
  loadMore: 'Φόρτωσε περισσότερα',
  guestPrompt: 'Συνδέσου για να σχολιάσεις',
}

/** Stands in for the comments list: renders the ids it was handed, in order. */
const ListStub = defineComponent({
  props: { comments: { type: Array as () => { id: number }[], default: () => [] } },
  setup: props => () => h('ol', props.comments.map(c => h('li', { 'data-comment': c.id }))),
})

/** Stands in for DynamicForm: one button that submits a fixed value. */
const FormStub = defineComponent({
  emits: ['submit'],
  setup: (_, { emit }) => () => h('button', { 'data-test': 'submit', 'onClick': () => emit('submit', { content: 'Νέο σχόλιο' }) }),
})

describe.each(trees(BlogPostComments, WebsideBlogPostComments))('$tree BlogPostComments', ({ C, own }) => {
  const mount = () => mountSuspended(C, {
    route: false,
    props: { blogPostId: '42', commentsCount: 2, displayImageOf: 'user' },
    global: {
      stubs: {
        [`Lazy${own('BlogPostCommentsList')}`]: ListStub,
        [own('BlogPostCommentsList')]: ListStub,
        LazyDynamicForm: FormStub,
        DynamicForm: FormStub,
        [`Lazy${own('AccountLoginFormModal')}`]: true,
      },
    },
  })

  const renderedIds = (wrapper: Awaited<ReturnType<typeof mount>>) =>
    wrapper.findAll('[data-comment]').map(li => Number(li.attributes('data-comment')))

  const button = (wrapper: Awaited<ReturnType<typeof mount>>, label: string) =>
    wrapper.findAll('button').find(b => b.text() === label)
  const loadMore = (wrapper: Awaited<ReturnType<typeof mount>>) => button(wrapper, COPY.loadMore)

  beforeEach(() => {
    clearNuxtData()
    useState<CursorState>('cursor-state').value = generateInitialCursorState()
    useUserStore().blogLikedComments = []
    state.flags = {}
    session.loggedIn && (session.loggedIn.value = false)
    session.user && (session.user.value = null)
  })

  it('loads the next page through the Nuxt proxy route, never the absolute Django URL', async () => {
    api.routes({ [PROXY_URL]: page([comment(1, '2026-08-01T00:00:00Z')], NEXT_PAGE_URL) })
    const wrapper = await mount()
    await flushPromises()
    api.routes({ [PROXY_URL]: page([comment(2, '2026-07-01T00:00:00Z')]) })

    await loadMore(wrapper)!.trigger('click')
    await flushPromises()

    expect(api.mock.calls.filter(([url]) => String(url).startsWith('http'))).toEqual([])
    // The load-more request carries the query parsed out of `links.next`.
    expect(api.callsTo(PROXY_URL).at(-1)!.options).toEqual({
      query: expect.objectContaining({ cursor: 'Y3Vyc29yOjE=', pageSize: '3' }),
    })
    expect(renderedIds(wrapper)).toEqual([1, 2])
    // The last page has no `next`: the button goes away.
    expect(loadMore(wrapper)).toBeUndefined()
  })

  it('merges a loaded page without duplicates, newest first', async () => {
    api.routes({ [PROXY_URL]: page([comment(1, '2026-08-01T00:00:00Z')], NEXT_PAGE_URL) })
    const wrapper = await mount()
    await flushPromises()
    api.routes({ [PROXY_URL]: page([comment(1, '2026-08-01T00:00:00Z'), comment(3, '2026-08-05T00:00:00Z')]) })

    await loadMore(wrapper)!.trigger('click')
    await flushPromises()

    expect(renderedIds(wrapper)).toEqual([3, 1])
  })

  it('toasts an error and keeps the loaded comments when the next page fails', async () => {
    api.routes({ [PROXY_URL]: page([comment(1, '2026-08-01T00:00:00Z')], NEXT_PAGE_URL) })
    const wrapper = await mount()
    await flushPromises()
    api.routes({ [PROXY_URL]: () => { throw new Error('502') } })

    await loadMore(wrapper)!.trigger('click')
    await flushPromises()

    expect(toastAdd).toHaveBeenCalledWith({ title: expect.any(String), color: 'error' })
    expect(renderedIds(wrapper)).toEqual([1])
  })

  it('loads the signed-in reader\'s like state for the first page', async () => {
    session.loggedIn.value = true
    session.user.value = { id: 7 }
    api.routes({
      [PROXY_URL]: page([comment(1, '2026-08-01T00:00:00Z'), comment(2, '2026-07-01T00:00:00Z')]),
      '/api/blog/comments/liked-comments': ((_url, options) => {
        options.onResponse({ response: { ok: true, _data: { likedCommentIds: [2] } } })
        return {}
      }) satisfies ApiRouteHandler,
    })

    await mount()
    await flushPromises()

    expect(api.callsTo('/api/blog/comments/liked-comments')[0]!.options)
      .toMatchObject({ method: 'POST', body: { commentIds: [1, 2] } })
    expect(useUserStore().blogLikedComments).toEqual([2])
  })

  it('never asks a guest\'s like state', async () => {
    api.routes({ [PROXY_URL]: page([comment(1, '2026-08-01T00:00:00Z')]) })

    await mount()
    await flushPromises()

    expect(api.callsTo('/api/blog/comments/liked-comments')).toEqual([])
  })

  it('posts a signed-in reader\'s comment in the page locale and re-fetches on success', async () => {
    session.loggedIn.value = true
    session.user.value = { id: 7 }
    const created = comment(9, '2026-08-09T00:00:00Z')
    api.routes({
      [PROXY_URL]: page([]),
      '/api/blog/comments': (async (_url, options) => {
        await options.onResponse({ response: { ok: true, _data: created } })
        return created
      }) satisfies ApiRouteHandler,
    })
    const wrapper = await mount()
    await flushPromises()
    const fetchesBefore = api.callsTo(PROXY_URL).length

    await wrapper.find('[data-test="submit"]').trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/blog/comments')[0]!.options).toMatchObject({
      method: 'POST',
      body: { post: 42, user: 7, translations: { el: { content: 'Νέο σχόλιο' } } },
    })
    expect(wrapper.emitted('reply-add')).toEqual([[created]])
    expect(api.callsTo(PROXY_URL).length).toBe(fetchesBefore + 1)
    expect(toastAdd).toHaveBeenCalledWith({ title: expect.any(String), color: 'success' })
  })

  it('toasts an error when the comment is refused', async () => {
    session.loggedIn.value = true
    session.user.value = { id: 7 }
    api.routes({
      [PROXY_URL]: page([]),
      '/api/blog/comments': ((_url, options) => {
        options.onResponseError()
        return {}
      }) satisfies ApiRouteHandler,
    })
    const wrapper = await mount()
    await flushPromises()

    await wrapper.find('[data-test="submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('reply-add')).toBeUndefined()
    expect(toastAdd).toHaveBeenCalledWith({ title: expect.any(String), color: 'error' })
  })

  it('offers a guest the sign-in prompt instead of the comment form', async () => {
    api.routes({ [PROXY_URL]: page([]) })

    const wrapper = await mount()
    await flushPromises()

    expect(wrapper.find('[data-test="submit"]').exists()).toBe(false)
    expect(button(wrapper, COPY.guestPrompt)).toBeTruthy()
  })

  it('renders nothing when the merchant turned comments off', async () => {
    state.flags = { BLOG_COMMENTS_ENABLED: false }
    api.routes({ [PROXY_URL]: page([comment(1, '2026-08-01T00:00:00Z')]) })

    const wrapper = await mount()
    await flushPromises()

    expect(wrapper.find('#blog-post-comments').exists()).toBe(false)
    expect(renderedIds(wrapper)).toEqual([])
  })
})
