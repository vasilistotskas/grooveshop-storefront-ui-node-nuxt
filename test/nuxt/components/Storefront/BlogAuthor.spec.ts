import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, onErrorCaptured } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import BlogAuthor from '~/components/Storefront/BlogAuthor.vue'
import WebsideBlogAuthor from '~/components/variants/webside/Storefront/BlogAuthor.vue'
import { createAsyncDataMock } from '~~/test/helpers/asyncData'

/**
 * The author page body. The default tree was redesigned (an identity
 * card, "Posts by <name>", a numbered pagination); the frozen webside
 * copy keeps its original body, run on its own first, and the redesign
 * has its own suite after it.
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

/**
 * Both bodies render the empty state as `<Lazy…EmptyState>`, which Nuxt
 * compiles to a direct async import — no stub key matches it, so the
 * module it imports is mocked instead.
 */
vi.mock('~/components/Empty/State.vue', () => ({ default: { template: '<div data-test="empty" />' } }))
vi.mock('~/components/variants/webside/Empty/State.vue', () => ({ default: { template: '<div data-test="empty" />' } }))

mockNuxtImport('useApi', () => () => author)
mockNuxtImport('useLazyApi', () => () => posts)

/** Stands in for every post card the two trees render: shows the post id. */
const CardStub = defineComponent({
  props: { post: { type: Object, required: true }, headingLevel: { type: String, default: undefined } },
  setup: props => () => h('li', { 'data-post': (props.post as { id: number }).id, 'data-level': props.headingLevel }),
})

describe('Webside author page', () => {
  const C = WebsideBlogAuthor
  const mount = () => mountSuspended(C, {
    route: false,
    global: {
      stubs: {
        BlogPostCard: CardStub,
        WebsideBlogPostCardMobile: CardStub,
        WebsideBlogPostCardDesktop: CardStub,
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

/**
 * The redesigned author page: one identity card (initials or photo, the
 * post count, the name, the bio, the website), then "Posts by <first
 * name>" with the ordering beside it and the author's posts below. The
 * author endpoint carries no role and no email, so the page shows none.
 */
describe('Storefront/BlogAuthor', () => {
  const mount = () => mountSuspended(BlogAuthor, {
    route: false,
    global: { stubs: { BlogPostCard: CardStub } },
  })

  beforeEach(() => {
    author.reset()
    posts.reset()
    author.data.value = makeAuthor()
    posts.data.value = { results: [], count: 0 }
    posts.status.value = 'success'
  })

  it.each([
    // A failed refresh keeps the last author in `data`: the error alone must 404.
    { name: 'the author request fails', data: makeAuthor(), error: new Error('Not Found') },
    { name: 'there is no such author', data: undefined, error: undefined },
  ])('is a 404 when $name', async ({ data, error }) => {
    author.data.value = data
    author.error.value = error

    let captured: unknown
    const Parent = defineComponent({
      setup() {
        onErrorCaptured((thrown) => {
          captured ??= thrown
          return false
        })
        return () => h(BlogAuthor)
      },
    })
    const wrapper = await mountSuspended(Parent, { route: false })
    await flushPromises()
    wrapper.unmount()

    expect(captured).toMatchObject({ statusCode: 404 })
  })

  describe('identity card', () => {
    it('names the author in the page heading, with initials where there is no photo', async () => {
      const wrapper = await mount()

      expect(wrapper.get('h1').text()).toBe('Mike Ganos')
      expect(wrapper.get('header').text()).toContain('MG')
    })

    it('counts the author\'s posts', async () => {
      author.data.value = makeAuthor({ numberOfPosts: 14 })
      const many = await mount()
      expect(many.get('header').text()).toContain('14 άρθρα')

      author.data.value = makeAuthor({ numberOfPosts: 1 })
      const one = await mount()
      expect(one.get('header').text()).toContain('1 άρθρο')
      expect(one.get('header').text()).not.toContain('1 άρθρα')
    })

    it('counts the likes received only when there are some', async () => {
      author.data.value = makeAuthor({ totalLikesReceived: 12 })
      const liked = await mount()
      expect(liked.get('header').text()).toContain('12 μου αρέσει')

      author.data.value = makeAuthor({ totalLikesReceived: 0 })
      const none = await mount()
      expect(none.get('header').text()).not.toContain('μου αρέσει')
    })

    it('shows no role and no email: the author carries neither', async () => {
      const wrapper = await mount()

      expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
      expect(wrapper.get('header').text()).not.toMatch(/editor|συντάκτης/i)
    })

    it('renders each paragraph of the bio as its own paragraph', async () => {
      author.data.value = makeAuthor({
        translations: { el: { bio: '<p>Ο <strong>Mike</strong> είναι marketer.</p>\n\n<p>Ασχολείται με το Digital Marketing.</p>' } },
      })

      const wrapper = await mount()

      const paragraphs = wrapper.findAll('.author-bio p')
      expect(paragraphs).toHaveLength(2)
      expect(paragraphs[0]!.find('strong').text()).toBe('Mike')
      expect(paragraphs[1]!.text()).toBe('Ασχολείται με το Digital Marketing.')
    })

    it('never renders markup the sanitiser drops', async () => {
      author.data.value = makeAuthor({ translations: { el: { bio: '<p>Hello</p><script>alert(1)</script>' } } })

      const wrapper = await mount()

      expect(wrapper.get('.author-bio').html()).not.toContain('script')
      expect(wrapper.get('.author-bio').text()).toBe('Hello')
    })

    it('renders no bio block without a bio', async () => {
      const wrapper = await mount()

      expect(wrapper.find('.author-bio').exists()).toBe(false)
    })

    it('links the author\'s website in a new tab without passing authority', async () => {
      author.data.value = makeAuthor({ website: 'https://mike.example' })

      const wrapper = await mount()

      const link = wrapper.get('a[href="https://mike.example"]')
      expect(link.attributes('aria-label')).toBe('Ιστοσελίδα')
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toBe('noopener noreferrer nofollow')
    })

    it('has no website link without a website', async () => {
      const wrapper = await mount()

      expect(wrapper.find('[aria-label="Ιστοσελίδα"]').exists()).toBe(false)
    })
  })

  describe('posts', () => {
    it('names the list after the author\'s first name', async () => {
      const wrapper = await mount()

      expect(wrapper.get('h2').text()).toBe('Άρθρα από Mike')
    })

    it('falls back to the full name for an author without a first name', async () => {
      author.data.value = makeAuthor({ user: { id: 7, firstName: '', lastName: 'Ganos', mainImagePath: null } })

      const wrapper = await mount()

      expect(wrapper.get('h2').text()).toBe('Άρθρα από Ganos')
    })

    it('lists one card per post, under the list heading in the outline', async () => {
      posts.data.value = { results: [{ id: 11 }, { id: 12 }], count: 2 }

      const wrapper = await mount()

      expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-post'))).toEqual(['11', '12'])
      expect(wrapper.findAll('[data-post]').map(li => li.attributes('data-level'))).toEqual(['h3', 'h3'])
      expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
    })

    it('shows the empty state for an author with no posts', async () => {
      const wrapper = await mount()

      expect(wrapper.find('[data-test="empty"]').exists()).toBe(true)
      expect(wrapper.findAll('[data-post]')).toEqual([])
    })

    it('shows skeletons, not the empty state, while the posts load', async () => {
      posts.data.value = undefined
      posts.status.value = 'pending'

      const wrapper = await mount()

      expect(wrapper.findAllComponents({ name: 'USkeleton' })).toHaveLength(6)
      expect(wrapper.find('[data-test="empty"]').exists()).toBe(false)
    })

    it('offers the ordering only when there are posts to order', async () => {
      const empty = await mount()
      expect(empty.findComponent({ name: 'Ordering' }).exists()).toBe(false)

      posts.data.value = { results: [{ id: 11 }], count: 1 }
      const withPosts = await mount()
      expect(withPosts.findComponent({ name: 'Ordering' }).exists()).toBe(true)
    })
  })
})
