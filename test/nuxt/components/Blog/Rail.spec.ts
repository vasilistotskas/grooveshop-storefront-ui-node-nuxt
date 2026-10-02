import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogRail from '~/components/Blog/Rail.vue'
import type { BlogPost } from '~~/shared/openapi/types.gen'
import { makeBlogPost } from '~~/test/fixtures/blog'

const mountRail = (props: { posts: BlogPost[], categoryName?: (id: number) => string | undefined }) =>
  mountSuspended(BlogRail, { route: false, props, global: { stubs: { ImgWithFallback: true } } })

/**
 * The teaser of a few posts on a page that is not `/blog`: each card
 * is one link to its post, with what a reader decides on — category,
 * date, reading time, title — and nothing of the `/blog` card's
 * footer.
 */
describe('BlogRail', () => {
  it('links each card to its post, under the post\'s title', async () => {
    const wrapper = await mountRail({ posts: [makeBlogPost({ id: 3, slug: 'gan' }), makeBlogPost({ id: 4, slug: 'usb-c' })] })

    const links = wrapper.findAll('h3 a').map(a => [a.text(), a.attributes('href')])
    expect(links).toEqual([['Άρθρο 3', '/blog/post/3/gan'], ['Άρθρο 4', '/blog/post/4/usb-c']])
  })

  it('names the post\'s category where the band knows it, and says how long the read is', async () => {
    const wrapper = await mountRail({
      posts: [makeBlogPost({ category: 2, readingTime: 6 })],
      categoryName: (id: number) => (id === 2 ? 'Οδηγοί αγοράς' : undefined),
    })

    expect(wrapper.findComponent({ name: 'UBadge' }).text()).toBe('Οδηγοί αγοράς')
    expect(wrapper.text()).toContain('6 λεπτά ανάγνωσης')
  })

  it('draws no category badge where the category is unknown', async () => {
    const wrapper = await mountRail({ posts: [makeBlogPost()], categoryName: () => undefined })

    expect(wrapper.findComponent({ name: 'UBadge' }).exists()).toBe(false)
  })

  it('carries none of the /blog card\'s like, comment or share controls', async () => {
    const wrapper = await mountRail({ posts: [makeBlogPost({ likesCount: 4, commentsCount: 2 })] })

    expect(wrapper.find('button').exists()).toBe(false)
  })
})
