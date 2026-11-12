import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogPostsCarousel from '~/components/PageSection/BlogPostsCarousel.vue'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The store's writing as a swipeable rail, on a band: the posts arrive read
 * (the page route resolved them), and a list with nothing in it draws no band.
 */
const posts = (items: BlogPost[]) => ({
  status: items.length ? 'ok' : 'empty',
  items,
  total: items.length,
  descriptor: { mode: 'filter', ordering: 'newest', limit: 6 },
}) as ResolvedQuery<BlogPost, DataDescriptor<'blogPost'>>

const stubs = { BlogPostCard: { props: ['post'], template: '<article data-test="post">{{ post.id }}</article>' } }

const mountCarousel = (props: Record<string, unknown> = {}) =>
  mountSuspended(BlogPostsCarousel, { route: false, props: { posts: posts([makeBlogPost({ id: 1 }), makeBlogPost({ id: 2 })]), ...props }, global: { stubs } })

describe('PageSection/BlogPostsCarousel', () => {
  beforeEach(() => {
    setTenant()
  })

  it('draws a card for each post under the operator\'s heading', async () => {
    const wrapper = await mountCarousel({ heading: 'Νέα άρθρα' })

    expect(wrapper.get('h2').text()).toBe('Νέα άρθρα')
    expect(wrapper.findAll('[data-test="post"]').map(post => post.text())).toEqual(['1', '2'])
  })

  it('draws no band when there are no posts', async () => {
    const wrapper = await mountCarousel({ posts: posts([]) })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  // The colour scheme reaches the band, which draws it as Nuxt UI's subtree
  // switch (`Band.spec.ts`).
  it.each(['dark', 'light'] as const)('draws the band in the %s colour scheme the block sets', async (colorScheme) => {
    const wrapper = await mountCarousel({ colorScheme })

    expect(wrapper.get('section').classes()).toContain(colorScheme)
  })
})
