import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ListProductReviewsResponse, ProductReviewDetail } from '~~/shared/openapi/types.gen'
import Section from '~/components/Product/Reviews/Section.vue'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'

/**
 * The reviews of a product page: the summary, the way to write one, and
 * the list. The sheet has its own spec; here it shows what it was opened
 * with and can report a change.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { session, flags } = vi.hoisted(() => ({
  session: { loggedIn: false },
  flags: { reviews: true },
}))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(session.loggedIn),
  user: ref(session.loggedIn ? { id: 7 } : null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => key === 'PRODUCT_REVIEWS_ENABLED' ? flags.reviews : options.fallback))
mockNuxtImport('useRoute', () => () => ({
  name: 'products-id-slug___el',
  params: { id: '42', slug: 'pot' },
  query: {},
  path: '/products/42/pot',
  fullPath: '/products/42/pot?variant=3#details',
  hash: '#details',
  matched: [],
  meta: {},
}))

vi.mock('~/components/Product/Review.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: { open: Boolean, userProductReview: { type: Object, default: null }, userHadReviewed: { type: Boolean, default: null } },
      emits: ['update:open', 'add-existing-review'],
      setup(props, { emit }) {
        return () => props.open
          ? h('div', { 'data-sheet': props.userHadReviewed ? 'edit' : 'write' }, [
              h('button', { 'data-save': '', 'onClick': () => emit('add-existing-review') }),
            ])
          : null
      },
    }),
  }
})

const PRODUCT = { ...makeProduct({ id: 42, reviewAverage: 8, reviewCount: 2 }), ratingDistribution: [{ rate: 8, count: 2 }] }
const FIRST_PAGE: ListProductReviewsResponse = {
  count: 2,
  links: {},
  results: [makeProductReview({ id: 1 }), makeProductReview({ id: 2 })],
}
const OWN_REVIEW: ProductReviewDetail = { ...makeProductReview({ id: 9 }), product: makeProduct({ id: 42 }) }

const mountSection = async (props: Partial<InstanceType<typeof Section>['$props']> = {}) => {
  const wrapper = await mountSuspended(Section, {
    route: false,
    props: { product: PRODUCT, productName: 'Γλάστρα', firstPage: FIRST_PAGE, ...props },
  })
  await flushPromises()
  return wrapper
}
const userReviewRequests = () => api.callsTo('/api/products/reviews/42/user-product-review')
const writeButton = (wrapper: Awaited<ReturnType<typeof mountSection>>, label: string) =>
  wrapper.findAll('button, a').find(node => node.text() === label)

beforeEach(() => {
  session.loggedIn = false
  flags.reviews = true
  clearNuxtData(['productReviews42undefined', 'productReviews427'])
  api.routes({ '/api/products/reviews/42/user-product-review': OWN_REVIEW })
})

describe('Product/Reviews/Section', () => {
  it('is the target of the rating by the title, clear of the sticky header', async () => {
    const wrapper = await mountSection()

    const section = wrapper.get('section#reviews')
    expect(section.attributes('aria-labelledby')).toBe(section.get('h2').attributes('id'))
    // The class is the contract: the header is sticky, so `#reviews` scrolls to it.
    expect(section.classes()).toContain('scroll-mt-24')
  })

  it('draws the summary and the list, and invites the first review when there are none', async () => {
    const reviewed = await mountSection()
    expect(reviewed.findAll('article')).toHaveLength(2)
    expect(reviewed.text()).toContain('4,0')

    const empty = await mountSection({
      product: { ...PRODUCT, reviewAverage: 0, reviewCount: 0, ratingDistribution: [] },
      firstPage: { count: 0, links: {}, results: [] },
    })
    expect(empty.findAll('article')).toHaveLength(0)
    expect(empty.text()).toContain('Δεν υπάρχουν ακόμα αξιολογήσεις')
  })

  describe('a guest', () => {
    it('is sent to sign in and brought back to the reviews of this product', async () => {
      const wrapper = await mountSection()

      const link = writeButton(wrapper, 'Συνδέσου για να γράψεις κριτική')!
      expect(link.element.tagName).toBe('A')
      const next = new URL(link.attributes('href')!, 'http://shop.test').searchParams.get('next')
      // The page's own fragment is replaced, its query is kept.
      expect(next).toBe('/products/42/pot?variant=3#reviews')
    })

    it('has no review of their own to fetch', async () => {
      await mountSection()

      expect(userReviewRequests()).toEqual([])
    })
  })

  describe('a signed-in shopper', () => {
    beforeEach(() => {
      session.loggedIn = true
    })

    it('writes a review in the sheet, mounted when they ask for it', async () => {
      api.routes({ '/api/products/reviews/42/user-product-review': null })
      const wrapper = await mountSection()
      expect(wrapper.find('[data-sheet]').exists()).toBe(false)

      await writeButton(wrapper, 'Γράψε κριτική')!.trigger('click')

      await vi.waitFor(() => expect(wrapper.get('[data-sheet]').attributes('data-sheet')).toBe('write'))
    })

    it('edits the review they already wrote', async () => {
      const wrapper = await mountSection()
      await vi.waitFor(() => expect(writeButton(wrapper, 'Ενημέρωση κριτικής')).toBeDefined())

      await writeButton(wrapper, 'Ενημέρωση κριτικής')!.trigger('click')

      await vi.waitFor(() => expect(wrapper.get('[data-sheet]').attributes('data-sheet')).toBe('edit'))
    })

    it('tells the page, once the sheet changed the review, to refresh the list and the average', async () => {
      const wrapper = await mountSection()
      await vi.waitFor(() => expect(writeButton(wrapper, 'Ενημέρωση κριτικής')).toBeDefined())
      await writeButton(wrapper, 'Ενημέρωση κριτικής')!.trigger('click')
      await vi.waitFor(() => expect(wrapper.find('[data-save]').exists()).toBe(true))
      const before = userReviewRequests().length

      await wrapper.get('[data-save]').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('changed')).toHaveLength(1)
      expect(userReviewRequests()).toHaveLength(before + 1)
    })

    it('can still write one when their own review could not be fetched', async () => {
      api.routes({ '/api/products/reviews/42/user-product-review': failWith(404) })
      const wrapper = await mountSection()

      await vi.waitFor(() => expect(writeButton(wrapper, 'Γράψε κριτική')).toBeDefined())
    })

    it('fetches nothing of their own when the store has reviews off', async () => {
      flags.reviews = false

      await mountSection()

      expect(userReviewRequests()).toEqual([])
    })
  })
})
