import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import BlogPost from '~/components/Storefront/BlogPost.vue'
import WebsideBlogPost from '~/components/variants/webside/Storefront/BlogPost.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'
import { makeBlogPost } from '~~/test/fixtures/blog'

/**
 * A blog post page counts one view of the post in its route, once it
 * has mounted (so a server render never counts one).
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)
mockNuxtImport('useRequestApi', () => () => api)

// UTooltip needs UApp's TooltipProvider, which a bare mount does not have.
mockComponent('UTooltip', { template: '<div><slot /></div>' })

const { route } = vi.hoisted(() => ({ route: { params: { id: '7', slug: 'spring-guide' } } }))
mockNuxtImport('useRoute', () => () => ({
  params: route.params,
  query: {},
  path: `/blog/post/${route.params.id}/${route.params.slug}`,
  fullPath: `/blog/post/${route.params.id}/${route.params.slug}`,
  name: 'blog-post-id-slug___el',
  hash: '',
  matched: [],
  meta: {},
}))

/** The fields of a `BlogPostDetail` the page reads. */
const POST = {
  id: 7,
  uuid: fixtureUuid(9, 7),
  slug: 'spring-guide',
  likes: [],
  translations: { el: { title: 'Οδηγός άνοιξης', subtitle: '', body: '<p>Κείμενο</p>' } },
  author: { id: 3, uuid: fixtureUuid(9, 3), translations: { el: { bio: '' } } },
  category: { id: 2, uuid: fixtureUuid(9, 2), slug: 'guides', translations: { el: { name: 'Οδηγοί' } } },
  tags: [],
  viewCount: 0,
  likesCount: 0,
  commentsCount: 0,
  tagsCount: 0,
  isPublished: true,
  publishedAt: FIXTURE_TIMESTAMP,
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
}

describe.each([
  ['default', BlogPost],
  ['webside', WebsideBlogPost],
])('BlogPost view count (%s tree)', (_tree, Component) => {
  beforeEach(() => {
    clearNuxtData()
    // What app.vue's setupCursorState provides the comment list.
    clearCursorState()
    setTenant({ blogEnabled: true })
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/blog/posts/7': POST,
      '/api/blog/categories/2': POST.category,
      '/api/blog/authors/3': POST.author,
      '/api/*': empty,
    })
  })

  it('posts one view for the post in the route once mounted', async () => {
    const wrapper = await mountSuspended(Component, { route: false })
    await flushPromises()

    expect(api.callsTo('/api/blog/posts/*').filter(call => call.url.endsWith('/update-view-count'))).toEqual([
      { url: '/api/blog/posts/7/update-view-count', options: expect.objectContaining({ method: 'POST' }) },
    ])
    wrapper.unmount()
  })
})

/**
 * The redesigned post page: breadcrumb, byline, the article with its
 * "On this page" list, and the posts to read next. The frozen webside
 * page has its own markup, so these run on the default tree only.
 */
const BODY = '<p>Εισαγωγή</p><h2>Τι μετράει</h2><p>x</p><h3>Η τάση</h3><p>y</p><h2>Πόσο χρειάζεσαι</h2>'

const RICH_POST = {
  ...POST,
  translations: { el: { ...POST.translations.el, body: BODY } },
  author: { ...POST.author, user: { id: 5, username: 'anna', firstName: 'Άννα', lastName: 'Κ.', mainImagePath: '' } },
  readingTime: 6,
  commentsCount: 12,
}

describe('BlogPost page (default tree)', () => {
  function serve(post: Record<string, unknown> = RICH_POST, related: unknown[] = []) {
    const empty = { count: 0, next: null, previous: null, results: [] }
    api.routes({
      '/api/blog/posts/7': post,
      '/api/blog/categories/2': POST.category,
      '/api/blog/authors/3': post.author,
      '/api/blog/posts/7/related-posts': related,
      '/api/*': empty,
    })
  }

  beforeEach(() => {
    clearNuxtData()
    clearCursorState()
    setTenant({ blogEnabled: true })
    serve()
  })

  async function mount() {
    const wrapper = await mountSuspended(BlogPost, { route: false })
    await flushPromises()
    return wrapper
  }

  it('gives the table of contents the headings of the post, an h3 under its h2, and puts their anchors on the headings', async () => {
    const wrapper = await mount()

    const toc = wrapper.findComponent({ name: 'UContentToc' })
    expect(toc.props('title')).toBe('Σε αυτή τη σελίδα')
    expect(toc.props('links')).toEqual([
      { id: 'section-1', depth: 2, text: 'Τι μετράει', children: [{ id: 'section-2', depth: 3, text: 'Η τάση' }] },
      { id: 'section-3', depth: 2, text: 'Πόσο χρειάζεσαι' },
    ])
    await vi.waitFor(() => expect(wrapper.find('#section-1').text()).toBe('Τι μετράει'))
  })

  it('draws no list for a post without headings', async () => {
    serve({ ...RICH_POST, translations: { el: { ...POST.translations.el, body: '<p>Μόνο κείμενο</p>' } } })

    const wrapper = await mount()

    expect(wrapper.findComponent({ name: 'UContentToc' }).exists()).toBe(false)
    expect(wrapper.find('aside').exists()).toBe(false)
  })

  it('trails Blog, then the category of the post', async () => {
    const wrapper = await mount()

    expect(wrapper.findComponent({ name: 'PageBreadcrumb' }).props('items')).toEqual([
      { label: 'Blog', to: '/blog' },
      { label: 'Οδηγοί' },
    ])
  })

  it('names the author and says how long the post takes to read', async () => {
    const wrapper = await mount()

    const byline = wrapper.find('header').text()
    expect(byline).toContain('Άννα Κ.')
    expect(byline).toContain('6 λεπτά ανάγνωσης')
  })

  it('says the post was updated only when it changed after it went live', async () => {
    const unchanged = await mount()
    expect(unchanged.find('header').text()).not.toContain('Ενημερώθηκε στις')

    clearNuxtData()
    serve({ ...RICH_POST, updatedAt: '2026-06-01T10:00:00Z', publishedAt: '2026-05-01T10:00:00Z' })
    const changed = await mount()

    expect(changed.find('header').text()).toContain('Ενημερώθηκε στις')
  })

  it('shows the comment count beside the like button', async () => {
    const wrapper = await mount()

    expect(wrapper.find('header button[title="12 σχόλια"]').text()).toBe('12')
  })

  describe('keep reading', () => {
    const related = [1, 2, 3, 4].map(id => makeBlogPost({ id: 100 + id, slug: `related-${id}`, translations: { el: { title: `Σχετικό ${id}`, subtitle: '' } } }))

    it('offers the first three related posts, and a way to all of them', async () => {
      serve(RICH_POST, related)

      const wrapper = await mount()

      const section = wrapper.find('section[aria-label="Συνέχισε το διάβασμα"]')
      expect(section.findAll('h3').map(heading => heading.text())).toEqual(['Σχετικό 1', 'Σχετικό 2', 'Σχετικό 3'])
      expect(section.find('a[href$="/blog"]').exists()).toBe(true)
    })

    it('leaves the section out when there are none', async () => {
      const wrapper = await mount()

      expect(wrapper.find('section[aria-label="Συνέχισε το διάβασμα"]').exists()).toBe(false)
    })
  })
})
