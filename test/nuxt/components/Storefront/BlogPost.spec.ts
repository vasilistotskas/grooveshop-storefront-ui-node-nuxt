import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mountSuspended, mockComponent, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import BlogPost from '~/components/Storefront/BlogPost.vue'
import WebsideBlogPost from '~/components/variants/webside/Storefront/BlogPost.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'

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
