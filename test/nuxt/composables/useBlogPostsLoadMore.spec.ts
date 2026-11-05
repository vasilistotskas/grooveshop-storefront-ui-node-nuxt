import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, nextTick } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { failWith } from '~~/test/helpers/api'
import { makeBlogPost } from '~~/test/fixtures/blog'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const toast = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }))
mockNuxtImport('useToast', () => () => toast)

const POSTS_URL = '/api/blog/posts'

type Posts = ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>

const ids = (...list: number[]) => list.map(id => makeBlogPost({ id }))

/** A band's `posts` as the page route resolves it: `shown` of `total` posts. */
const band = (shown: number[], total: number, descriptor: DataDescriptor<'blogPost'> = { mode: 'filter', ordering: 'newest', limit: 3 }): Posts => ({
  status: 'ok',
  items: ids(...shown),
  total,
  descriptor,
})

/** What `/api/blog/posts` answers for a page: `count` is every post of the list, `next` whether a page follows. */
const page = (posts: number[], count: number, next: boolean) => ({
  count,
  links: { next: next ? 'https://api.test/blog/post?page=3' : null, previous: null },
  results: ids(...posts),
})

/** Runs the composable in a component's setup, as a band does, and hands back what it returned. */
async function setup(posts: Posts, enabled = true) {
  const state = reactive({ posts, enabled })
  let result!: ReturnType<typeof useBlogPostsLoadMore>
  await mountSuspended(defineComponent({
    setup() {
      result = useBlogPostsLoadMore({ posts: () => state.posts, enabled: () => state.enabled, errorTitle: () => 'Το φόρτωμα απέτυχε' })
      return () => h('div')
    },
  }), { route: false })
  return { state, ...result }
}

const shownIds = (items: { value: BlogPost[] }) => items.value.map(post => post.id)

describe('useBlogPostsLoadMore', () => {
  beforeEach(() => {
    toast.add.mockReset()
  })

  it('reads the next page of the same rule: the size, the ordering, the category and featured it lists by', async () => {
    api.routes({ [POSTS_URL]: page([4, 5, 6], 9, true) })
    const { items, loadMore } = await setup(band([1, 2, 3], 9, { mode: 'filter', category: 7, featured: false, ordering: 'mostViewed', limit: 3 }))

    await loadMore()

    expect(api.callsTo(POSTS_URL)[0]!.options.query).toEqual({
      pageSize: 3,
      ordering: '-viewCount',
      category: 7,
      featured: false,
      page: 2,
      languageCode: 'el',
    })
    expect(shownIds(items)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('goes on with the page after the one it read', async () => {
    api.routes({ [POSTS_URL]: (_url: string, options: { query: { page: number } }) => options.query.page === 2 ? page([4, 5, 6], 9, true) : page([7, 8, 9], 9, false) })
    const { items, loadMore } = await setup(band([1, 2, 3], 9))

    await loadMore()
    await loadMore()

    expect(api.callsTo(POSTS_URL).map(call => call.options.query.page)).toEqual([2, 3])
    expect(shownIds(items)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('offers more while the band shows fewer posts than the list has, and not once it shows them all', async () => {
    api.routes({ [POSTS_URL]: page([4, 5], 5, false) })
    const { hasMore, loadMore } = await setup(band([1, 2, 3], 5))
    expect(hasMore.value).toBe(true)

    await loadMore()

    expect(hasMore.value).toBe(false)
  })

  it('offers nothing when it is off, when the list is hand-picked, or when the band shows everything', async () => {
    const off = await setup(band([1, 2, 3], 9), false)
    const picked = await setup(band([1, 2, 3], 9, { mode: 'picked', ids: [1, 2, 3] }))
    const everything = await setup(band([1, 2, 3], 3))

    expect([off.hasMore.value, picked.hasMore.value, everything.hasMore.value]).toEqual([false, false, false])
    await picked.loadMore()
    expect(api.callsTo(POSTS_URL)).toHaveLength(0)
  })

  it('offers nothing for a band whose read failed or matched nothing', async () => {
    const failed = await setup({ ...band([], 0), status: 'failed' })
    const empty = await setup({ ...band([], 0), status: 'empty' })

    expect([failed.hasMore.value, empty.hasMore.value]).toEqual([false, false])
  })

  it('shows a post once when the list moved between two reads', async () => {
    api.routes({ [POSTS_URL]: page([3, 4, 4, 5], 6, true) })
    const { items, added, loadMore } = await setup(band([1, 2, 3], 6))

    await loadMore()

    expect(shownIds(items)).toEqual([1, 2, 3, 4, 5])
    expect(added.value).toBe(2)
  })

  it('takes the list\'s new size from the page it read', async () => {
    api.routes({ [POSTS_URL]: page([4, 5], 5, true) })
    const { hasMore, loadMore } = await setup(band([1, 2, 3], 9))

    await loadMore()

    expect(hasMore.value).toBe(false)
  })

  it('stops offering when a page has no successor, even if posts it repeated leave the count short', async () => {
    api.routes({ [POSTS_URL]: page([1, 2, 3], 9, false) })
    const { hasMore, loadMore } = await setup(band([1, 2, 3], 9))

    await loadMore()

    expect(hasMore.value).toBe(false)
  })

  it('keeps what is shown, tells the shopper why, and lets them try again when a page fails', async () => {
    api.routes({ [POSTS_URL]: failWith(503, { detail: 'Η υπηρεσία δεν είναι διαθέσιμη.' }) })
    const { items, hasMore, loading, loadMore } = await setup(band([1, 2, 3], 9))

    await loadMore()

    expect(shownIds(items)).toEqual([1, 2, 3])
    expect(hasMore.value).toBe(true)
    expect(loading.value).toBe(false)
    expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ id: 'blog-posts:load-more', title: 'Το φόρτωμα απέτυχε', color: 'error' }))

    api.routes({ [POSTS_URL]: page([4, 5, 6], 9, true) })
    await loadMore()

    expect(api.callsTo(POSTS_URL).map(call => call.options.query.page)).toEqual([2, 2])
    expect(shownIds(items)).toEqual([1, 2, 3, 4, 5, 6])
  })

  it('reads one page for a second press while the first is still on its way', async () => {
    let answer!: (value: unknown) => void
    api.routes({ [POSTS_URL]: () => new Promise((resolve) => {
      answer = resolve
    }) })
    const { loading, loadMore } = await setup(band([1, 2, 3], 9))

    const first = loadMore()
    await loadMore()
    expect(loading.value).toBe(true)
    answer(page([4, 5, 6], 9, true))
    await first

    expect(api.callsTo(POSTS_URL)).toHaveLength(1)
    expect(loading.value).toBe(false)
  })

  it('starts again when the band is read again', async () => {
    api.routes({ [POSTS_URL]: page([4, 5, 6], 9, true) })
    const { state, items, loadMore } = await setup(band([1, 2, 3], 9))
    await loadMore()

    state.posts = band([11, 12, 13], 9)
    await nextTick()
    await flushPromises()

    expect(shownIds(items)).toEqual([11, 12, 13])
    await loadMore()
    expect(api.callsTo(POSTS_URL).map(call => call.options.query.page)).toEqual([2, 2])
  })
})
