import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import Band from '~/components/PageSection/Band.vue'
import BlogPosts from '~/components/PageSection/BlogPosts.vue'
import CtaBanner from '~/components/PageSection/CtaBanner.vue'
import ProductCategories from '~/components/PageSection/ProductCategories.vue'
import ProductsSlider from '~/components/PageSection/ProductsSlider.vue'
import BlogCategoriesSection from '~/components/PageSection/BlogCategories.vue'
import LoyaltyHero from '~/components/PageSection/LoyaltyHero.vue'

/**
 * The page-builder bands, and the three rules the redesign turns on:
 *
 * 1. a band with nothing to show renders NOTHING — not a heading over
 *    an empty state, which is what a brand-new store used to open on;
 * 2. a band carries the content frame, so the stack can be full-width
 *    without every section losing its measure;
 * 3. the operator's own colour still has to be readable.
 */

const POSTS: any[] = []
const PRODUCTS: any[] = []
const BLOG_CATEGORIES: any[] = []

const loggedIn = ref(false)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn,
  user: ref(null),
  session: ref({}),
  fetch: vi.fn(),
  clear: vi.fn(),
}))

registerEndpoint('/api/blog/posts', () => ({ results: POSTS, count: POSTS.length }))
registerEndpoint('/api/products', () => ({ results: PRODUCTS, count: PRODUCTS.length }))
registerEndpoint('/api/blog/categories', () => ({
  results: BLOG_CATEGORIES,
  count: BLOG_CATEGORIES.length,
}))

// The loyalty hero fetches three of these on mount. Answering them
// keeps the member case from throwing unhandled rejections that have
// nothing to do with what is being asserted.
registerEndpoint('/api/loyalty/summary', () => ({
  points: 0,
  tier: null,
  pointsToNextTier: null,
}))
registerEndpoint('/api/loyalty/tiers', () => ({ results: [] }))
registerEndpoint('/api/loyalty/settings', () => ({}))

const categories = ref<any[]>([])
mockNuxtImport('useCategoryMenu', () => () => ({ categories }))

mockNuxtImport('useTenantStore', () => () => ({
  blogEnabled: true,
  loyaltyEnabled: true,
  schemaName: 'demo',
}))

const { fetchMock } = vi.hoisted(() => ({
  fetchMock: vi.fn((url: any) => {
    const path = String(url)
    if (path.includes('/api/blog/posts')) {
      return Promise.resolve({ results: POSTS, count: POSTS.length })
    }
    if (path.includes('/api/loyalty/summary')) {
      return Promise.resolve({ points: 0, tier: null, pointsToNextTier: null })
    }
    if (path.includes('/api/loyalty/tiers')) {
      return Promise.resolve({ results: [] })
    }
    if (path.includes('/api/loyalty/settings')) {
      return Promise.resolve({})
    }
    if (path.includes('/api/blog/categories')) {
      return Promise.resolve({
        results: BLOG_CATEGORIES,
        count: BLOG_CATEGORIES.length,
      })
    }
    if (path.includes('/api/products')) {
      return Promise.resolve({ results: PRODUCTS, count: PRODUCTS.length })
    }
    return Promise.resolve({})
  }),
}))
mockNuxtImport('$fetch', () => fetchMock)

function setPosts(next: any[]) {
  POSTS.length = 0
  POSTS.push(...next)
}

function setProducts(next: any[]) {
  PRODUCTS.length = 0
  PRODUCTS.push(...next)
}

describe('PageSection/Band', () => {
  it('puts its content inside a real container, not a literal element', async () => {
    // The regression this guards: `<component :is="'UContainer'">`
    // resolves a STRING as an unknown ELEMENT, so `<UContainer>`
    // reached the document verbatim and every band on the page lost
    // its measure and its gutters.
    const wrapper = await mountSuspended(Band, {
      props: { heading: 'Προσφορές' },
      slots: { default: () => 'body' },
    })

    expect(wrapper.html()).not.toContain('<ucontainer')
    expect(wrapper.find('section > div').classes().join(' ')).toContain('mx-auto')
  })

  it('paints the raised surface only when asked', async () => {
    const ground = await mountSuspended(Band, { slots: { default: () => 'x' } })
    const raised = await mountSuspended(Band, {
      props: { surface: 'muted' },
      slots: { default: () => 'x' },
    })

    expect(ground.find('section').classes()).toContain('bg-default')
    expect(raised.find('section').classes()).toContain('bg-muted')
  })

  it('drops the container for a band that runs edge to edge', async () => {
    const wrapper = await mountSuspended(Band, {
      props: { bleed: true },
      slots: { default: () => 'x' },
    })

    expect(wrapper.find('section > div').classes().join(' ')).not.toContain('mx-auto')
  })
})

describe('PageSection/BlogPosts', () => {
  it('renders nothing at all when the store has published nothing', async () => {
    setPosts([])
    const wrapper = await mountSuspended(BlogPosts, { props: { count: 3 } })

    // Not "a heading over an empty state" — no band.
    expect(wrapper.find('section').exists()).toBe(false)
    expect(wrapper.text()).toBe('')
  })

  it('draws a band once there are posts', async () => {
    setPosts([
      { id: 1, translations: { el: { title: 'Πρώτο' } }, slug: 'first' },
    ])
    const wrapper = await mountSuspended(BlogPosts, { props: { count: 3 } })

    expect(wrapper.find('section').exists()).toBe(true)
    expect(wrapper.find('h2').text()).toBe('Από το blog')
  })

  it('takes the count from either section type’s prop name', async () => {
    // `blog_posts_grid` spells it `count`, `blog_posts_list` spells it
    // `pageSize`; one component serves both keys.
    setPosts([{ id: 1, translations: { el: { title: 'Πρώτο' } }, slug: 'first' }])

    const asList = await mountSuspended(BlogPosts, { props: { pageSize: 9 } })
    expect(asList.find('section').exists()).toBe(true)

    const calls = fetchMock.mock.calls.filter(c => String(c[0]).includes('/api/blog/posts'))
    expect(JSON.stringify(calls)).toContain('9')
  })
})

describe('PageSection/ProductsSlider', () => {
  it('renders nothing when the query comes back empty', async () => {
    setProducts([])
    const wrapper = await mountSuspended(ProductsSlider, {
      props: { ordering: 'newest' },
    })

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('names the band after the ordering it draws', async () => {
    setProducts([{ id: 7, translations: { el: { name: 'Καλώδιο' } }, slug: 'cable' }])
    const wrapper = await mountSuspended(ProductsSlider, {
      props: { ordering: 'discounted' },
    })

    expect(wrapper.find('h2').text()).toBe('Σε προσφορά')
  })
})

describe('PageSection/ProductCategories', () => {
  it('draws the roots when the catalogue has several', async () => {
    categories.value = [
      { id: 1, label: 'Ήχος', slug: 'audio', to: '/products/category/1/audio', children: [] },
      { id: 2, label: 'Θήκες', slug: 'cases', to: '/products/category/2/cases', children: [] },
    ]
    const wrapper = await mountSuspended(ProductCategories, { props: {} })

    expect(wrapper.text()).toContain('Ήχος')
    expect(wrapper.text()).toContain('Θήκες')
  })

  it('draws the CHILDREN when everything hangs under one root', async () => {
    // A single root is not a choice: the band would offer one tile
    // whose only job is to open the tree.
    categories.value = [
      {
        id: 1,
        label: 'Αξεσουάρ',
        slug: 'accessories',
        to: '/products/category/1/accessories',
        children: [
          { id: 2, label: 'Φορτιστές', slug: 'chargers', to: '/products/category/2/chargers', children: [] },
          { id: 3, label: 'Καλώδια', slug: 'cables', to: '/products/category/3/cables', children: [] },
        ],
      },
    ]
    const wrapper = await mountSuspended(ProductCategories, { props: {} })

    expect(wrapper.text()).toContain('Φορτιστές')
    expect(wrapper.text()).toContain('Καλώδια')
    expect(wrapper.text()).not.toContain('Αξεσουάρ')
  })

  it('renders nothing for a store with no categories', async () => {
    categories.value = []
    const wrapper = await mountSuspended(ProductCategories, { props: {} })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})

describe('PageSection/CtaBanner', () => {
  it('switches the copy to light over a dark operator colour', async () => {
    const wrapper = await mountSuspended(CtaBanner, {
      props: {
        heading: 'Δωρεάν αποστολή',
        backgroundColor: '#1F2937',
      },
    })

    expect(wrapper.find('section').attributes('style')).toContain('#1F2937')
    expect(wrapper.find('h2').classes().join(' ')).toContain('text-white')
  })

  it('keeps the page’s own colours over a light one', async () => {
    const wrapper = await mountSuspended(CtaBanner, {
      props: { heading: 'Δωρεάν αποστολή', backgroundColor: '#FFF7ED' },
    })

    expect(wrapper.find('h2').classes().join(' ')).not.toContain('text-white')
  })

  it('renders nothing without a heading, a description or a link', async () => {
    const wrapper = await mountSuspended(CtaBanner, { props: {} })

    expect(wrapper.find('section').exists()).toBe(false)
  })
})

describe('bands whose tenant flag is on but whose content is empty', () => {
  // Both of these shipped with a `v-if` that checked only the tenant
  // flag, which is true on a store that has the feature and nothing in
  // it yet. On the demo store `blog_categories` is the FIRST section,
  // so a shop with no posts opened on 80px of blank page.
  it('draws no blog-categories band when the blog has no categories', async () => {
    BLOG_CATEGORIES.length = 0
    const wrapper = await mountSuspended(BlogCategoriesSection)

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('draws the blog-categories band once there are categories', async () => {
    BLOG_CATEGORIES.length = 0
    BLOG_CATEGORIES.push({ id: 1, slug: 'news', translations: { el: { name: 'Νέα' } } })
    const wrapper = await mountSuspended(BlogCategoriesSection)

    expect(wrapper.find('section').exists()).toBe(true)
  })

  /**
   * The loyalty band's child is a `Lazy` component inside `ClientOnly`,
   * so `mountSuspended` resolves while its dynamic import is still in
   * flight. Under the full suite that import landed AFTER the test
   * environment had been torn down and vitest reported an unhandled
   * `EnvironmentTeardownError` — green tests, red run. Letting the
   * import settle and unmounting keeps it inside the test.
   */
  async function settleLazyChild(wrapper: { unmount: () => void }) {
    await new Promise(resolve => setTimeout(resolve, 0))
    wrapper.unmount()
  }

  it('draws no loyalty band for a guest, however the programme is set', async () => {
    loggedIn.value = false
    const wrapper = await mountSuspended(LoyaltyHero)

    expect(wrapper.find('section').exists()).toBe(false)
    await settleLazyChild(wrapper)
  })

  it('draws the loyalty band for a member', async () => {
    loggedIn.value = true
    const wrapper = await mountSuspended(LoyaltyHero)

    expect(wrapper.find('section').exists()).toBe(true)
    await settleLazyChild(wrapper)
  })
})
