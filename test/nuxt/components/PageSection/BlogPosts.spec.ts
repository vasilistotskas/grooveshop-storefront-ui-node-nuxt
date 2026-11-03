import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import BlogPosts from '~/components/PageSection/BlogPosts.vue'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { makeBlogCategory, makeBlogPost } from '~~/test/fixtures/blog'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const CATEGORIES_URL = '/api/blog/categories'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { heading: 'Από το blog', allPosts: 'Όλα τα άρθρα' }

/** Stands in for the rail: renders the ids of the posts it was handed, and their category's name. */
const RailStub = defineComponent({
  props: {
    posts: { type: Array as () => { id: number, category: number }[], default: () => [] },
    categoryName: { type: Function, default: undefined },
  },
  setup: props => () => h('ol', props.posts.map(p =>
    h('li', { 'data-post': p.id, 'data-category': props.categoryName?.(p.category) }))),
})

/** The `posts` data setting as the page route hands it over. */
const posts = (items: BlogPost[]) => ({
  status: items.length ? 'ok' : 'empty',
  items,
  descriptor: { mode: 'filter', ordering: 'newest', limit: 3 },
}) as ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>

const mountPosts = (props: Record<string, unknown> = {}, items: BlogPost[] = [makeBlogPost({ id: 1, category: 1 }), makeBlogPost({ id: 2, category: 2 })]) =>
  mountSuspended(BlogPosts, { route: false, props: { posts: posts(items), ...props }, global: { stubs: { BlogRail: RailStub } } })

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
})
