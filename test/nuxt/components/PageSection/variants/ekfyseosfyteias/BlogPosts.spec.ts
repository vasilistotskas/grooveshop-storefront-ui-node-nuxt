import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import BlogPosts from '~/components/PageSection/variants/ekfyseosfyteias/BlogPosts.vue'
import { setTenant } from '~~/test/helpers/tenant'
import { makeBlogPost } from '~~/test/fixtures/blog'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const POSTS_URL = '/api/blog/posts'

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = { heading: 'Ένας χρόνος στη Φυτειά', allPosts: 'Όλα τα άρθρα', read: 'Διαβάστε' }

const post = (id: number, title: string, publishedAt: string, subtitle = '') =>
  makeBlogPost({
    id,
    publishedAt,
    mainImagePath: `https://assets.example.test/post-${id}.jpg`,
    translations: { el: { title, subtitle } },
  })

const POSTS = [
  post(1, 'Το ροζ χωράφι', '2026-03-14T10:00:00+02:00', 'Ανθισμένες ροδακινιές.'),
  post(2, 'Χορός στην πλατεία', '2025-08-02T10:00:00+03:00'),
  post(3, 'Γιορτή κάστανου', '2024-10-20T10:00:00+03:00'),
  post(4, 'Γλυκά και παραμύθια', '2024-12-15T10:00:00+02:00'),
]

const mountPosts = (props: Record<string, unknown> = {}) =>
  mountSuspended(BlogPosts, { route: false, props })

/**
 * The season cards. The data path is the base band's, so what is worth
 * pinning is what this variant adds: the season and month read off the
 * publish date, the title as an h3, the optional subtitle, and a link
 * whose accessible name carries the post.
 */
describe('ekfyseosfyteias blog_posts_grid', () => {
  beforeEach(() => {
    clearNuxtData()
    setTenant({ blogEnabled: true })
    api.routes({ [POSTS_URL]: { results: POSTS, count: POSTS.length } })
  })

  it('names the season and the month of every post, in the page\'s language', async () => {
    const wrapper = await mountPosts({ count: 4 })

    const stamps = wrapper.findAll('ol > li').map(li => li.find('p').text())
    expect(stamps).toEqual([
      'ΆνοιξηΜάρτιος 2026',
      'ΚαλοκαίριΑύγουστος 2025',
      'ΦθινόπωροΟκτώβριος 2024',
      'ΧειμώναςΔεκέμβριος 2024',
    ])
  })

  it('makes each title an h3 and prints the subtitle only where there is one', async () => {
    const wrapper = await mountPosts({ count: 4 })

    expect(wrapper.findAll('h3').map(h => h.text())).toEqual(POSTS.map(p => p.translations.el!.title))
    expect(wrapper.text()).toContain('Ανθισμένες ροδακινιές.')
    expect(wrapper.findAll('ol > li')[1]!.findAll('p')).toHaveLength(1)
  })

  it('links each card to its post with the title in the link\'s name', async () => {
    const wrapper = await mountPosts({ count: 1 })

    const link = wrapper.find('ol a')
    expect(link.attributes('href')).toBe('/blog/post/1/post-1')
    expect(link.text()).toBe(`${COPY.read}: Το ροζ χωράφι`)
  })

  it('treats the photo as decoration, since the title sits beside it', async () => {
    const wrapper = await mountPosts({ count: 1 })

    expect(wrapper.find('ol img').attributes('alt')).toBe('')
  })

  it('asks for as many posts as the section says, and for the newest first', async () => {
    await mountPosts({ count: 2 })

    expect(api.callsTo(POSTS_URL)[0]!.options.query).toMatchObject({ pageSize: 2, ordering: '-publishedAt' })
  })

  it('heads the band with its own copy and link, else the blog\'s', async () => {
    const custom = await mountPosts({ heading: 'Δράσεις', subheading: 'Όλο τον χρόνο.', ctaText: 'Όλες οι δράσεις', ctaLink: '/info' })
    expect(custom.find('h2').text()).toBe('Δράσεις')
    expect(custom.text()).toContain('Όλο τον χρόνο.')
    expect(custom.find('a').attributes('href')).toBe('/info')

    clearNuxtData()
    const fallback = await mountPosts()
    expect(fallback.find('h2').text()).toBe(COPY.heading)
    const link = fallback.find('a')
    expect([link.text(), link.attributes('href')]).toEqual([COPY.allPosts, '/blog'])
  })

  it('asks for nothing and draws nothing when the store has its blog off', async () => {
    setTenant({ blogEnabled: false })

    const wrapper = await mountPosts()

    expect(wrapper.find('section').exists()).toBe(false)
    expect(api.callsTo(POSTS_URL)).toHaveLength(0)
  })

  it('draws nothing when nothing is published', async () => {
    api.routes({ [POSTS_URL]: { results: [], count: 0 } })

    const wrapper = await mountPosts()

    expect(wrapper.find('section').exists()).toBe(false)
  })
})
