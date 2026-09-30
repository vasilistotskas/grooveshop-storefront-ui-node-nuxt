import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import BlogPosts from '~/components/PageSection/BlogPosts.vue'
import { setTenant } from '~~/test/helpers/tenant'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const POSTS_URL = '/api/blog/posts'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { heading: 'Από το blog', allPosts: 'Όλα τα άρθρα' }

/** Stands in for the rail: renders the ids of the posts it was handed. */
const RailStub = defineComponent({
  props: { posts: { type: Array as () => { id: number }[], default: () => [] } },
  setup: props => () => h('ol', props.posts.map(p => h('li', { 'data-post': p.id }))),
})

const post = (id: number) => ({ id, slug: `post-${id}`, translations: { el: { title: `Άρθρο ${id}` } } })

const mountPosts = (props: Record<string, unknown> = {}) =>
  mountSuspended(BlogPosts, { route: false, props, global: { stubs: { BlogRail: RailStub } } })

/**
 * The store's writing as a band on another page. A band with nothing to
 * show renders NOTHING — not a heading over an empty state, which is
 * what a brand-new store used to open on.
 */
describe('PageSection/BlogPosts', () => {
  beforeEach(() => {
    // `useBlogRail` serves a cached payload for its key.
    clearNuxtData()
    setTenant({ blogEnabled: true })
    api.routes({ [POSTS_URL]: { results: [post(1), post(2)], count: 2 } })
  })

  it('draws the band with the posts, a heading and a link to the blog', async () => {
    const wrapper = await mountPosts()

    expect(wrapper.find('h2').text()).toBe(COPY.heading)
    expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-post'))).toEqual(['1', '2'])
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual([COPY.allPosts, '/blog'])
  })

  it('renders nothing at all when the store has published nothing', async () => {
    api.routes({ [POSTS_URL]: { results: [], count: 0 } })

    const wrapper = await mountPosts()

    expect(api.callsTo(POSTS_URL)).toHaveLength(1)
    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('asks for nothing and renders nothing when the tenant has no blog', async () => {
    setTenant({ blogEnabled: false })

    const wrapper = await mountPosts()

    expect(api.callsTo(POSTS_URL)).toEqual([])
    expect(wrapper.find('section').exists()).toBe(false)
  })

  it.each([
    // `blog_posts_grid` spells the size `count`, `blog_posts_list` spells
    // it `pageSize`; one component serves both keys.
    { props: {}, pageSize: 3 },
    { props: { count: 6 }, pageSize: 6 },
    { props: { pageSize: 9, count: 6 }, pageSize: 9 },
  ])('asks for $pageSize newest posts given $props', async ({ props, pageSize }) => {
    await mountPosts(props)

    expect(api.callsTo(POSTS_URL)[0]!.options.query).toEqual({
      pageSize,
      languageCode: 'el',
      ordering: '-publishedAt',
    })
  })

  it('narrows the rail to one category', async () => {
    await mountPosts({ categoryId: 5 })

    expect(api.callsTo(POSTS_URL)[0]!.options.query).toMatchObject({ category: '5' })
  })

  it('uses the operator\'s heading and link over the defaults', async () => {
    const wrapper = await mountPosts({ title: 'Τίτλος', heading: 'Νέα', ctaText: 'Περισσότερα', ctaLink: '/blog/category/5/news' })

    expect(wrapper.find('h2').text()).toBe('Νέα')
    const link = wrapper.find('a')
    expect([link.text(), link.attributes('href')]).toEqual(['Περισσότερα', '/blog/category/5/news'])
  })
})
