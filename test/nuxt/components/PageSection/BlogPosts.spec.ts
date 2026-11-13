import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import BlogPosts from '~/components/PageSection/BlogPosts.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { failWith } from '~~/test/helpers/api'
import { makeBlogCategory, makeBlogPost } from '~~/test/fixtures/blog'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const toast = vi.hoisted(() => ({ add: vi.fn(), update: vi.fn() }))
mockNuxtImport('useToast', () => () => toast)

const CATEGORIES_URL = '/api/blog/categories'
const POSTS_URL = '/api/blog/posts'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { heading: 'Από το blog', allPosts: 'Όλα τα άρθρα', loadMore: 'Φόρτωση περισσότερων άρθρων', loadError: 'Δεν φορτώθηκαν τα επόμενα άρθρα' }

/** Stands in for the rail: renders the ids of the posts it was handed, and their category's name. */
const RailStub = defineComponent({
  props: {
    posts: { type: Array as () => { id: number, category: number }[], default: () => [] },
    categoryName: { type: Function, default: undefined },
    stacked: { type: Boolean, default: false },
    phoneLayout: { type: String, default: undefined },
  },
  setup: props => () => h('ol', { 'data-stacked': props.stacked, 'data-phone-layout': props.phoneLayout }, props.posts.map(p =>
    h('li', { 'data-post': p.id, 'data-category': props.categoryName?.(p.category) }))),
})

/** The `posts` data setting as the page route hands it over. */
const posts = (items: BlogPost[], total = items.length) => ({
  status: items.length ? 'ok' : 'empty',
  items,
  total,
  descriptor: { mode: 'filter', ordering: 'newest', limit: 2 },
}) as ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>

const mountPosts = (props: Record<string, unknown> = {}, items: BlogPost[] = [makeBlogPost({ id: 1, category: 1 }), makeBlogPost({ id: 2, category: 2 })], total = items.length) =>
  mountSuspended(BlogPosts, { route: false, props: { posts: posts(items, total), ...props }, global: { stubs: { BlogRail: RailStub } } })

/**
 * The store's writing as a band on another page. A band with nothing to
 * show renders NOTHING — not a heading over an empty state, which is
 * what a brand-new store used to open on. The posts arrive read (the page
 * route resolved them); what the band still asks for is the name of each
 * post's category, the store's one shared list.
 */
describe('PageSection/BlogPosts', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant()
    setTenantFeatures({ blog: true })
    api.routes({
      [CATEGORIES_URL]: { results: [makeBlogCategory({ id: 1 }), makeBlogCategory({ id: 2 })], count: 2 },
    })
  })

  it('draws the band with the posts, a heading and a link to the blog', async () => {
    const wrapper = await mountPosts()

    expect(wrapper.find('h2').text()).toBe(COPY.heading)
    expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-post'))).toEqual(['1', '2'])
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual([COPY.allPosts, '/blog'])
  })

  // A band of ONE category's posts sends "see all" to that category, at the
  // slug it has now, as a products band keeps its in-stock rule.
  it('sends "see all" of a one-category band to that category, and to the blog when the category is gone', async () => {
    const ofCategory = (category: number) => ({ ...posts([makeBlogPost({ id: 1, category })]), descriptor: { mode: 'filter' as const, ordering: 'newest' as const, limit: 2, category } })

    const wrapper = await mountPosts({ posts: ofCategory(2), ctaText: 'Όλα τα άρθρα του θέματος' })
    const gone = await mountPosts({ posts: ofCategory(99) })

    expect(wrapper.get('a').attributes('href')).toBe('/blog/category/2/category-2')
    expect(wrapper.get('a').text()).toBe('Όλα τα άρθρα του θέματος')
    expect(gone.get('a').attributes('href')).toBe('/blog')
  })

  it('keeps an operator link over the category', async () => {
    const wrapper = await mountPosts({ posts: { ...posts([makeBlogPost({ id: 1, category: 2 })]), descriptor: { mode: 'filter' as const, ordering: 'newest' as const, limit: 2, category: 2 } }, ctaLink: '/offers' })

    expect(wrapper.get('a').attributes('href')).toBe('/offers')
  })

  it('names each post\'s category from the store\'s categories, in the page\'s language', async () => {
    const wrapper = await mountPosts()

    expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-category'))).toEqual(['Κατηγορία 1', 'Κατηγορία 2'])
    expect(api.callsTo(CATEGORIES_URL)[0]!.options.query).toEqual({ pageSize: 100, languageCode: 'el' })
  })

  it('renders nothing at all when the store has published nothing', async () => {
    const wrapper = await mountPosts({}, [])

    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('uses the operator\'s heading and link over the defaults', async () => {
    const wrapper = await mountPosts({ title: 'Τίτλος', heading: 'Νέα', ctaText: 'Περισσότερα', ctaLink: '/blog/category/5/news' })

    expect(wrapper.find('h2').text()).toBe('Νέα')
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Περισσότερα', '/blog/category/5/news'])
  })

  // `blog_posts_grid`'s phone layout reaches the rail, which draws it
  // (`Blog/Rail.spec.ts`); unset, the rail keeps its row to swipe.
  it.each([
    [undefined, undefined],
    ['list', 'list'],
  ] as const)('hands the phone layout %s to the rail', async (phoneLayout, handed) => {
    const wrapper = await mountPosts({ phoneLayout })

    expect(wrapper.get('ol').attributes('data-phone-layout')).toBe(handed)
  })

  describe('with `loadMore` on', () => {
    const FIRST_PAGE = [makeBlogPost({ id: 1, category: 1 }), makeBlogPost({ id: 2, category: 2 })]
    const loadMoreButton = (wrapper: Awaited<ReturnType<typeof mountPosts>>) => wrapper.findAll('button').find(button => button.text() === COPY.loadMore)

    beforeEach(() => {
      toast.add.mockReset()
    })

    it('draws no button when the setting is off, however many posts the list has', async () => {
      const wrapper = await mountPosts({}, FIRST_PAGE, 5)

      expect(loadMoreButton(wrapper)).toBeUndefined()
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
      expect(wrapper.get('[data-stacked]').attributes('data-stacked')).toBe('false')
    })

    it('lays the posts out as a grid, which a row to swipe could not hold more posts of', async () => {
      const wrapper = await mountPosts({ loadMore: true }, FIRST_PAGE, 5)

      expect(wrapper.get('[data-stacked]').attributes('data-stacked')).toBe('true')
    })

    it('adds the next posts of the same list below the first ones, and takes the button away when the list is shown', async () => {
      api.routes({ [POSTS_URL]: { count: 5, links: { next: null, previous: null }, results: [makeBlogPost({ id: 3 }), makeBlogPost({ id: 4 }), makeBlogPost({ id: 5 })] } })
      const wrapper = await mountPosts({ loadMore: true }, FIRST_PAGE, 5)

      await loadMoreButton(wrapper)!.trigger('click')
      await vi.waitFor(() => expect(wrapper.findAll('[data-post]')).toHaveLength(5))

      expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-post'))).toEqual(['1', '2', '3', '4', '5'])
      expect(api.callsTo(POSTS_URL)[0]!.options.query).toMatchObject({ pageSize: 2, ordering: '-publishedAt', page: 2 })
      expect(loadMoreButton(wrapper)).toBeUndefined()
    })

    it('keeps the posts it shows and the button, and says why, when a page cannot be read', async () => {
      api.routes({ [POSTS_URL]: failWith(502) })
      const wrapper = await mountPosts({ loadMore: true }, FIRST_PAGE, 5)

      await loadMoreButton(wrapper)!.trigger('click')
      await vi.waitFor(() => expect(toast.add).toHaveBeenCalledWith(expect.objectContaining({ title: COPY.loadError, color: 'error' })))

      expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-post'))).toEqual(['1', '2'])
      expect(loadMoreButton(wrapper)).toBeDefined()
    })

    it('draws no button over a band with nothing to show', async () => {
      const wrapper = await mountPosts({ loadMore: true }, [])

      expect(wrapper.find('button').exists()).toBe(false)
    })
  })

  // The colour scheme reaches the band, which draws it as Nuxt UI's subtree
  // switch (`Band.spec.ts`).
  it.each(['dark', 'light'] as const)('draws the band in the %s colour scheme the block sets', async (colorScheme) => {
    const wrapper = await mountPosts({ colorScheme })

    expect(wrapper.get('section').classes()).toContain(colorScheme)
  })
})

describe('PageSection/BlogPosts as a feature card', () => {
  beforeEach(() => {
    setTenant()
    setTenantFeatures({ blog: true })
  })

  it('draws one card in the section\'s scheme: the copy, the posts, then its button', async () => {
    const wrapper = await mountPosts({ layout: 'feature', eyebrow: 'Ψηφιακή ασφάλεια', heading: 'Προστάτεψε τους λογαριασμούς σου', icon: 'i-lucide-shield', ctaText: 'Ξεκίνα από την Ασφάλεια', ctaLink: '/blog', colorScheme: 'dark' })

    expect(wrapper.find('ol[data-stacked]').exists()).toBe(false)
    const card = wrapper.get('section > div > div')
    expect(card.classes()).toEqual(expect.arrayContaining(['dark', 'rounded-xl']))
    expect(card.get('h2').text()).toBe('Προστάτεψε τους λογαριασμούς σου')
    // The button closes the card on a phone: after the posts in the markup.
    const order = [...card.element.children].map(child => child.tagName.toLowerCase())
    expect(order.at(-1)).toBe('a')
    expect(order.indexOf('ul')).toBeLessThan(order.length - 1)
    expect(card.findAll('li')).toHaveLength(2)
  })
})
