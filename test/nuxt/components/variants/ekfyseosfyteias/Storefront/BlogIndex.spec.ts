import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import BlogIndex from '~/components/variants/ekfyseosfyteias/Storefront/BlogIndex.vue'
import type { BlogPost } from '~~/shared/openapi/types.gen'
import { makeBlogCategory, makeBlogPost } from '~~/test/fixtures/blog'

/**
 * «Δράσεις», the co-op's blog index. The data path is the platform
 * index's (`useBlogListing`), so what is worth pinning is what this
 * drawing adds: the h1 and breadcrumb, the chips and the live count, the
 * first post of the first page as the featured card, the sage seal card
 * for a post with no photograph, and the way the page asks for its posts.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

// Reactive, so a test can change the filter on a page that is already mounted.
const state = await vi.hoisted(async () => {
  const { reactive } = await import('vue')
  return reactive({ query: {} as Record<string, string> })
})
mockNuxtImport('useRoute', () => () => ({
  name: 'blog___el',
  params: {},
  get query() {
    return state.query
  },
  path: '/blog',
  fullPath: '/blog',
  hash: '',
  meta: {},
  matched: [],
}))

mockComponent('Pagination', {
  props: ['count', 'page', 'totalPages'],
  template: '<nav data-stub="pagination" :data-pages="totalPages" />',
})

/** The component's own `<i18n>` copy (el), which the global `$i18n` cannot reach. */
const COPY = {
  title: 'Δράσεις',
  readFeatured: 'Διαβάστε τη δράση',
  read: 'Διαβάστε',
  all: 'Όλες',
  empty: 'Δεν υπάρχουν δράσεις ακόμη.',
  emptyFiltered: 'Καμία δράση δεν ταιριάζει.',
}

const SOCIAL = makeBlogCategory({ id: 1, translations: { el: { name: 'Κοινωνική δράση', description: '' } }, postCount: 2 })
const EXPO = makeBlogCategory({ id: 2, translations: { el: { name: 'Εκθέσεις & γεύσεις', description: '' } }, postCount: 1 })
const UNUSED = makeBlogCategory({ id: 3, translations: { el: { name: 'Κενή', description: '' } }, postCount: 0 })

const post = (id: number, title: string, overrides: Partial<BlogPost> = {}) =>
  makeBlogPost({
    id,
    category: 1,
    publishedAt: '2026-03-22T10:00:00+02:00',
    mainImagePath: `https://assets.example.test/post-${id}.jpg`,
    translations: { el: { title, subtitle: `Περίληψη ${id}` } },
    ...overrides,
  })

const POSTS = [
  post(1, 'Το ροζ χωράφι', { category: 2 }),
  post(2, 'Χορός στην πλατεία'),
  post(3, 'Βιωματικό εργαστήρι κρουστών', { mainImagePath: '' }),
]

const envelope = (results: BlogPost[], extra: Record<string, unknown> = {}) => ({
  count: results.length,
  totalPages: 1,
  pageSize: 10,
  page: 1,
  pageTotalResults: results.length,
  links: { next: null, previous: null },
  results,
  ...extra,
})

function given(posts: BlogPost[], extra: Record<string, unknown> = {}) {
  api.routes({
    '/api/blog/posts': () => envelope(posts, extra),
    '/api/blog/categories': () => envelope([SOCIAL, EXPO, UNUSED] as never),
  })
}

/** The grid's cards: the list items that hold a post, not the chips'. */
const cardsOf = (wrapper: VueWrapper) => wrapper.findAll('li').filter(item => item.find('h3').exists())

async function mountIndex() {
  const wrapper = await mountSuspended(BlogIndex, { route: false })
  await flushPromises()
  return wrapper
}

const chips = (wrapper: VueWrapper) =>
  wrapper.findAll('nav[aria-label="Φίλτρο κατηγορίας"] a').map(link => [link.text(), link.attributes('href')])

beforeEach(() => {
  state.query = {}
  useState<CursorState>('cursor-state').value = generateInitialCursorState()
  clearNuxtData(['blogPostspageNumber', 'blogCategoryFilter'])
  given(POSTS)
})

describe('ekfyseosfyteias Storefront/BlogIndex', () => {
  it('has the trail Αρχική / Δράσεις with the page as current, above the one h1 and its lead', async () => {
    const wrapper = await mountIndex()

    const trail = wrapper.get('nav[aria-label="Διαδρομή"]')
    expect(trail.findAll('li').map(item => item.text())).toEqual(['Αρχική/', 'Δράσεις'])
    expect(trail.get('a').attributes('href')).toBe('/')
    expect(trail.get('[aria-current="page"]').text()).toBe(COPY.title)
    expect(wrapper.findAll('h1').map(h => h.text())).toEqual([COPY.title])
    expect(wrapper.text()).toContain('Δράσεις που οργανώνει ο συνεταιρισμός μας')
  })

  it('asks for the first page, newest published first, ten at a time', async () => {
    await mountIndex()

    expect(api.callsTo('/api/blog/posts')[0]!.options.query).toMatchObject({ pageSize: 10, ordering: '-publishedAt' })
  })

  it('opens with the first post as the featured card: category, date, h2, excerpt and a pill that names the post', async () => {
    const wrapper = await mountIndex()

    const featured = wrapper.get('article')
    expect(featured.get('h2').text()).toBe('Το ροζ χωράφι')
    expect(featured.text()).toContain('Εκθέσεις & γεύσεις')
    expect(featured.get('time').text()).toBe('22 Μαρτίου 2026')
    expect(featured.text()).toContain('Περίληψη 1')
    const cta = featured.get('a')
    expect(cta.attributes('href')).toBe('/blog/post/1/post-1')
    expect(cta.text()).toBe(`${COPY.readFeatured}: Το ροζ χωράφι`)
  })

  it('lists the other posts as cards with an h3 and a "read" link carrying the title', async () => {
    const wrapper = await mountIndex()

    const cards = cardsOf(wrapper)
    expect(cards.map(card => card.get('h3').text())).toEqual(['Χορός στην πλατεία', 'Βιωματικό εργαστήρι κρουστών'])
    expect(cards[0]!.get('a').attributes('href')).toBe('/blog/post/2/post-2')
    expect(cards[0]!.get('a').text()).toBe(`${COPY.read}: Χορός στην πλατεία`)
    expect(cards[0]!.text()).toContain('Κοινωνική δράση')
  })

  it('draws a post with no photograph as a seal card, without an image', async () => {
    const wrapper = await mountIndex()

    const [withPhoto, withoutPhoto] = cardsOf(wrapper)
    expect(withPhoto!.find('img').exists()).toBe(true)
    expect(withoutPhoto!.find('img').exists()).toBe(false)
    expect(withoutPhoto!.get('[aria-hidden="true"]').text()).toBe('φ')
  })

  it('has no like, comment or share controls', async () => {
    const wrapper = await mountIndex()

    expect(wrapper.findAll('button')).toHaveLength(0)
  })

  it('counts the activities in the current filter, in the singular for one', async () => {
    const many = await mountIndex()
    expect(many.get('[aria-live="polite"]').text()).toBe('3 δράσεις')

    given([POSTS[0]!])
    clearNuxtData(['blogPostspageNumber'])
    const one = await mountIndex()
    expect(one.get('[aria-live="polite"]').text()).toBe('1 δράση')
  })

  it('offers «Όλες» and a chip per category that has posts, each a link to the filtered page', async () => {
    const wrapper = await mountIndex()

    expect(chips(wrapper)).toEqual([
      [COPY.all, '/blog'],
      ['Κοινωνική δράση', '/blog?category=1'],
      ['Εκθέσεις & γεύσεις', '/blog?category=2'],
    ])
  })

  it('marks the chip of the chosen category as current, and «Όλες» when none is chosen', async () => {
    const all = await mountIndex()
    expect(all.get('nav a[aria-current="true"]').text()).toBe(COPY.all)

    state.query = { category: '2' }
    const chosen = await mountIndex()
    expect(chosen.get('nav a[aria-current="true"]').text()).toBe('Εκθέσεις & γεύσεις')
    expect(api.callsTo('/api/blog/posts').at(-1)!.options.query).toMatchObject({ category: '2' })
  })

  it('has no featured card past the first page: every post is a card', async () => {
    state.query = { page: '2' }
    given(POSTS, { page: 2, totalPages: 2 })

    const wrapper = await mountIndex()

    expect(wrapper.find('article').exists()).toBe(false)
    expect(cardsOf(wrapper)).toHaveLength(3)
  })

  it('numbers the pages only when there is more than one', async () => {
    const single = await mountIndex()
    expect(single.find('[data-stub="pagination"]').exists()).toBe(false)

    given(POSTS, { totalPages: 2, count: 13 })
    clearNuxtData(['blogPostspageNumber'])
    const several = await mountIndex()
    expect(several.get('[data-stub="pagination"]').attributes('data-pages')).toBe('2')
    expect(several.get('[aria-live="polite"]').text()).toBe('13 δράσεις')
  })

  it('says there are no activities for an empty blog, and offers the way out of an empty filter', async () => {
    given([])
    const empty = await mountIndex()
    expect(empty.text()).toContain(COPY.empty)

    state.query = { category: '1' }
    clearNuxtData(['blogPostspageNumber'])
    const filtered = await mountIndex()
    expect(filtered.text()).toContain(COPY.emptyFiltered)
    expect(filtered.findAll('a').at(-1)!.attributes('href')).toBe('/blog')
  })
})
