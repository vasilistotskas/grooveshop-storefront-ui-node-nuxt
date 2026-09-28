import { describe, it, expect, beforeEach } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { ref } from 'vue'
import BlogAuthor from '~/components/Storefront/BlogAuthor.vue'
import WebsideBlogAuthor from '~/components/variants/webside/Storefront/BlogAuthor.vue'

/**
 * The author bio is rich text. It used to be a plain textarea printed
 * with `{{ }}`, so HTML collapsed the blank lines between its paragraphs
 * into one block — reported on webside.gr/blog/author/2. Both the
 * default body and the frozen webside one render it.
 */
let bio: string | null = null

mockNuxtImport('useRoute', () => () => ({
  params: { id: '2' },
  query: {},
  path: '/blog/author/2',
  fullPath: '/blog/author/2',
  name: 'blog-author-id___el',
  meta: {},
  matched: [],
  hash: '',
}))

mockNuxtImport('useApi', () => () => Promise.resolve({
  data: ref({
    id: 2,
    user: { id: 7, firstName: 'Mike', lastName: 'Ganos', mainImagePath: null },
    website: '',
    numberOfPosts: 0,
    totalLikesReceived: 0,
    translations: { el: { bio } },
  }),
  error: ref(null),
}))

mockNuxtImport('useLazyApi', () => () => ({
  data: ref({ results: [], count: 0, links: {}, totalPages: 0, pageSize: 12, page: 1 }),
  status: ref('success'),
  error: ref(null),
}))

describe.each([
  ['default', BlogAuthor],
  ['webside', WebsideBlogAuthor],
])('%s author page bio', (_name, Body) => {
  beforeEach(() => {
    bio = null
  })

  it('renders each paragraph as its own paragraph', async () => {
    bio = '<p>Ο <strong>Mike</strong> είναι marketer.</p>\n\n<p>Ασχολείται με το Digital Marketing.</p>'

    const wrapper = await mountSuspended(Body)

    const paragraphs = wrapper.findAll('.article p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]!.find('strong').text()).toBe('Mike')
    expect(paragraphs[1]!.text()).toBe('Ασχολείται με το Digital Marketing.')
  })

  it('never renders markup the sanitiser drops', async () => {
    bio = '<p>Hello</p><script>alert(1)</script>'

    const wrapper = await mountSuspended(Body)

    expect(wrapper.find('.article').html()).not.toContain('script')
    expect(wrapper.find('.article').text()).toBe('Hello')
  })

  it('renders no bio block without a bio', async () => {
    const wrapper = await mountSuspended(Body)

    expect(wrapper.find('.article').exists()).toBe(false)
  })
})
