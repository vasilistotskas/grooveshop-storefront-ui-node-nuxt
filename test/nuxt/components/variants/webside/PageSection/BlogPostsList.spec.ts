import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { failWith } from '~~/test/helpers/api'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import BlogPostsList from '~/components/variants/webside/PageSection/BlogPostsList.vue'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const toast = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }))
mockNuxtImport('useToast', () => () => toast)

const POSTS_URL = '/api/blog/posts'

/** The component's own `<i18n>` copy (el) and the shared button's, which the global `$i18n` cannot reach. */
const COPY = { loadMore: 'Φόρτωση περισσότερων άρθρων', loadError: 'Δεν φορτώθηκαν τα επόμενα άρθρα' }

const FIRST_PAGE = [makeBlogPost({ id: 1 }), makeBlogPost({ id: 2 })]

/** The `posts` data setting as the page route hands it over. */
const posts = (total: number) => ({
  status: 'ok',
  items: FIRST_PAGE,
  total,
  descriptor: { mode: 'filter', ordering: 'newest', limit: 2 },
}) as ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>

const mountList = (props: Record<string, unknown> = {}, total = 5) =>
  mountSuspended(BlogPostsList, { route: false, props: { posts: posts(total), ...props } })

const loadMoreButton = (wrapper: Awaited<ReturnType<typeof mountList>>) => wrapper.findAll('button').find(button => button.text() === COPY.loadMore)

/**
 * webside's band of blog posts. The band draws the posts its block lists;
 * with `loadMore` on it goes on with the same list, through the one
 * composable both designs share (this design makes no request of its own).
 */
describe('webside PageSection/BlogPostsList', () => {
  beforeEach(() => {
    toast.add.mockReset()
    setTenant()
    setTenantFeatures({ blog: true })
  })

  it('draws a card for each post and no button when the setting is off', async () => {
    const wrapper = await mountList()

    expect(wrapper.findAll('ol > *')).toHaveLength(2)
    expect(loadMoreButton(wrapper)).toBeUndefined()
  })

  it('adds the next posts of the same list below the first ones, and takes the button away when the list is shown', async () => {
    api.routes({ [POSTS_URL]: { count: 4, links: { next: null, previous: null }, results: [makeBlogPost({ id: 3 }), makeBlogPost({ id: 4 })] } })
    const wrapper = await mountList({ loadMore: true }, 4)

    await loadMoreButton(wrapper)!.trigger('click')
    await vi.waitFor(() => expect(wrapper.findAll('ol > *')).toHaveLength(4))

    expect(api.callsTo(POSTS_URL)[0]!.options.query).toMatchObject({ pageSize: 2, ordering: '-publishedAt', page: 2 })
    expect(loadMoreButton(wrapper)).toBeUndefined()
  })

  // The variant and colour are the contract: webside draws its "more" buttons
  // soft and neutral (`variants/webside/Pagination/Cursor.vue`), not in the
  // default design's outline.
  it('draws the button in webside\'s own look', async () => {
    const wrapper = await mountList({ loadMore: true })

    const button = wrapper.findAllComponents({ name: 'UButton' })
      .find(found => found.attributes('aria-busy') !== undefined)!
    expect(button.props()).toMatchObject({ variant: 'soft', color: 'neutral', size: 'md' })
    expect(button.attributes('aria-busy')).toBe('false')
  })

  it('keeps the posts it shows and the button, and says why, when a page cannot be read', async () => {
    api.routes({ [POSTS_URL]: failWith(502) })
    const wrapper = await mountList({ loadMore: true })

    await loadMoreButton(wrapper)!.trigger('click')
    await vi.waitFor(() => expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ title: COPY.loadError, color: 'error' })))

    expect(wrapper.findAll('ol > *')).toHaveLength(2)
    expect(loadMoreButton(wrapper)).toBeDefined()
  })
})
