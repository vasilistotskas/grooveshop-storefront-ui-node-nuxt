import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BlogRail from '~/components/Blog/Rail.vue'
import type { BlogPost } from '~~/shared/openapi/types.gen'
import { makeBlogPost } from '~~/test/fixtures/blog'
import { inlineT } from '~~/test/helpers/inlineCopy'

const mountRail = (props: { posts: BlogPost[], categoryName?: (id: number) => string | undefined, stacked?: boolean, phoneLayout?: 'row' | 'list' }) =>
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

  /**
   *  on a phone: compact rows, each the thumbnail beside
   * "category · reading time" and the title, the title's link stretched over
   * the row. The classes are the contract (happy-dom lays nothing out, the
   * browser is the real check): the list is a column of rows below `sm`,
   * each row a grid, and from `sm` up the row to swipe as ever.
   */
  describe('as a list on a phone', () => {
    const POSTS = [makeBlogPost({ id: 3, slug: 'gan', category: 2, readingTime: 4 })]
    const categoryName = (id: number) => (id === 2 ? 'Οδηγοί αγοράς' : undefined)

    it('draws each post as a compact row: category and reading time, then the title, one link', async () => {
      const wrapper = await mountRail({ posts: POSTS, categoryName, phoneLayout: 'list' })

      const list = wrapper.get('ul')
      expect(list.attributes('data-phone-layout')).toBe('list')
      expect(list.classes()).toEqual(expect.arrayContaining(['flex-col', 'sm:flex-row', 'sm:overflow-x-auto']))
      const row = wrapper.get('li')
      expect(row.classes()).toEqual(expect.arrayContaining(['grid', 'grid-cols-[6.5rem_minmax(0,1fr)]', 'py-3', 'sm:flex']))
      const t = inlineT('app/components/Blog/Rail.vue')
      expect(row.get('[data-slot="compact-meta"]').text()).toBe(`Οδηγοί αγοράς · ${t('reading_time', { minutes: 4 }, 4)}`)
      // The whole row is the post's one link.
      expect(row.findAll('a').map(a => [a.attributes('href'), a.classes('after:inset-0')])).toEqual([['/blog/post/3/gan', true]])
    })

    it.each([
      ['the row to swipe, unset', undefined, false],
      ['a stacked band', 'list', true],
    ] as const)('stays as it was for %s', async (_case, phoneLayout, stacked) => {
      const wrapper = await mountRail({ posts: POSTS, categoryName, phoneLayout, stacked })

      expect(wrapper.get('ul').attributes('data-phone-layout')).toBeUndefined()
      expect(wrapper.find('[data-slot="compact-meta"]').exists()).toBe(false)
    })
  })
})
