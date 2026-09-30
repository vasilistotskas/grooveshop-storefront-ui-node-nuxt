import { describe, it, expect, beforeEach } from 'vitest'
import { defineComponent, h, onErrorCaptured } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import BlogAuthor from '~/components/Storefront/BlogAuthor.vue'
import WebsideBlogAuthor from '~/components/variants/webside/Storefront/BlogAuthor.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'
import { trees } from '~~/test/helpers/trees'

/**
 * The author page body, over both trees: the default body and the
 * frozen webside one share their script logic (the webside one only
 * picks a mobile or desktop post card).
 */
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

const makeAuthor = (overrides: Record<string, unknown> = {}) => ({
  id: 2,
  user: { id: 7, firstName: 'Mike', lastName: 'Ganos', mainImagePath: null },
  website: '',
  numberOfPosts: 0,
  totalLikesReceived: 0,
  translations: { el: { bio: null as string | null } },
  ...overrides,
})

const author = createAsyncDataMock<ReturnType<typeof makeAuthor>>()
const posts = createAsyncDataMock<{ results: { id: number }[], count: number }>()

mockNuxtImport('useApi', () => () => author)
mockNuxtImport('useLazyApi', () => () => posts)

/** Stands in for every post card the two trees render: shows the post id. */
const CardStub = defineComponent({
  props: { post: { type: Object, required: true } },
  setup: props => () => h('li', { 'data-post': (props.post as { id: number }).id }),
})

describe.each(trees(BlogAuthor, WebsideBlogAuthor))('$tree author page', ({ C, own }) => {
  const mount = () => mountSuspended(C, {
    route: false,
    global: {
      stubs: {
        BlogPostCard: CardStub,
        WebsideBlogPostCardMobile: CardStub,
        WebsideBlogPostCardDesktop: CardStub,
        [`Lazy${own('EmptyState')}`]: { template: '<div data-test="empty" />' },
        [own('EmptyState')]: { template: '<div data-test="empty" />' },
      },
    },
  })

  /** The first error the body's setup throws, captured as Nuxt's error boundary would. */
  async function setupError(): Promise<unknown> {
    let captured: unknown
    const Parent = defineComponent({
      setup() {
        onErrorCaptured((error) => {
          captured ??= error
          return false
        })
        return () => h(C)
      },
    })
    const wrapper = await mountSuspended(Parent, { route: false })
    await flushPromises()
    wrapper.unmount()
    return captured
  }

  beforeEach(() => {
    author.reset()
    posts.reset()
    author.data.value = makeAuthor()
    posts.data.value = { results: [], count: 0 }
    posts.status.value = 'success'
  })

  /**
   * The author bio is rich text. It used to be a plain textarea printed
   * with `{{ }}`, so HTML collapsed the blank lines between its paragraphs
   * into one block — reported on webside.gr/blog/author/2.
   */
  it('renders each paragraph of the bio as its own paragraph', async () => {
    author.data.value = makeAuthor({
      translations: { el: { bio: '<p>Ο <strong>Mike</strong> είναι marketer.</p>\n\n<p>Ασχολείται με το Digital Marketing.</p>' } },
    })

    const wrapper = await mount()

    const paragraphs = wrapper.findAll('.article p')
    expect(paragraphs).toHaveLength(2)
    expect(paragraphs[0]!.find('strong').text()).toBe('Mike')
    expect(paragraphs[1]!.text()).toBe('Ασχολείται με το Digital Marketing.')
  })

  it('never renders markup the sanitiser drops', async () => {
    author.data.value = makeAuthor({ translations: { el: { bio: '<p>Hello</p><script>alert(1)</script>' } } })

    const wrapper = await mount()

    expect(wrapper.find('.article').html()).not.toContain('script')
    expect(wrapper.find('.article').text()).toBe('Hello')
  })

  it('renders no bio block without a bio', async () => {
    const wrapper = await mount()

    expect(wrapper.find('h1').text()).toBe('Mike Ganos')
    expect(wrapper.find('.article').exists()).toBe(false)
  })

  it.each([
    // A failed refresh keeps the last author in `data`: the error alone must 404.
    { name: 'the author request fails', data: makeAuthor(), error: new Error('Not Found') },
    { name: 'there is no such author', data: undefined, error: undefined },
  ])('is a 404 when $name', async ({ data, error }) => {
    author.data.value = data
    author.error.value = error

    expect(await setupError()).toMatchObject({ statusCode: 404 })
  })

  it('links the author\'s website in a new tab without passing authority', async () => {
    author.data.value = makeAuthor({ website: 'https://mike.example' })

    const wrapper = await mount()

    const link = wrapper.find('a[href="https://mike.example"]')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toBe('noopener noreferrer nofollow')
  })

  it('lists one card per post', async () => {
    posts.data.value = { results: [{ id: 11 }, { id: 12 }], count: 2 }

    const wrapper = await mount()

    expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-post'))).toEqual(['11', '12'])
    expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
  })

  it('shows the empty state for an author with no posts', async () => {
    const wrapper = await mount()

    expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-post]')).toEqual([])
  })
})
