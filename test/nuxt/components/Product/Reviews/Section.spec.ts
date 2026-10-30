import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ListProductReviewsResponse, ProductReviewDetail } from '~~/shared/openapi/types.gen'
import Section from '~/components/Product/Reviews/Section.vue'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'

/**
 * The reviews of a product page: the summary, the way to write one, and
 * the list. The sheet has its own spec; here it shows what it was opened
 * with and can report a change.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const { session, page, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import('vue')
  return {
    session: { loggedIn: ref(false), ready: ref(true) },
    // The page's fragment: what a link into the page carries.
    page: { hash: '#details' },
    navigateToMock: vi.fn(),
  }
})
mockNuxtImport('navigateTo', () => navigateToMock)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: session.loggedIn,
  user: computed(() => session.loggedIn.value ? { id: 7 } : null),
  session: ref({}),
  ready: session.ready,
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))
mockNuxtImport('useRoute', () => () => ({
  name: 'products-id-slug___el',
  params: { id: '42', slug: 'pot' },
  query: {},
  path: '/products/42/pot',
  fullPath: `/products/42/pot?variant=3${page.hash}`,
  hash: page.hash,
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
  session.loggedIn.value = false
  session.ready.value = true
  page.hash = '#details'
  navigateToMock.mockClear()
  setTenant()
  setTenantFeatures({ productReviews: true })
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

  // The delivery e-mails link here with #write-review.
  describe('the #write-review link', () => {
    beforeEach(() => {
      page.hash = '#write-review'
    })

    it('is the summary and the way to write, clear of the sticky header', async () => {
      const wrapper = await mountSection()

      const target = wrapper.get('#write-review')
      expect(target.classes()).toContain('scroll-mt-24')
      expect(target.find('h2').exists()).toBe(true)
    })

    it('opens the sheet for a signed-in shopper', async () => {
      session.loggedIn.value = true
      api.routes({ '/api/products/reviews/42/user-product-review': null })

      const wrapper = await mountSection()

      await vi.waitFor(() => expect(wrapper.get('[data-sheet]').attributes('data-sheet')).toBe('write'))
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('sends a guest to sign in and back to the same fragment', async () => {
      await mountSection()

      await vi.waitFor(() => expect(navigateToMock).toHaveBeenCalledOnce())
      const next = new URL(navigateToMock.mock.calls[0]![0] as string, 'http://shop.test').searchParams.get('next')
      expect(next).toBe('/products/42/pot?variant=3#write-review')
    })

    it('waits for the session before choosing, since a cached page knows no shopper', async () => {
      session.ready.value = false
      const wrapper = await mountSection()
      expect(navigateToMock).not.toHaveBeenCalled()
      expect(wrapper.find('[data-sheet]').exists()).toBe(false)

      session.loggedIn.value = true
      session.ready.value = true

      await vi.waitFor(() => expect(wrapper.find('[data-sheet]').exists()).toBe(true))
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('does nothing on a store with reviews off', async () => {
      setTenantFeatures({ productReviews: false })
      session.loggedIn.value = true

      const wrapper = await mountSection()

      expect(wrapper.find('[data-sheet]').exists()).toBe(false)
      expect(navigateToMock).not.toHaveBeenCalled()
    })

    it('is not triggered by any other fragment', async () => {
      page.hash = '#reviews'
      session.loggedIn.value = true

      const wrapper = await mountSection()

      expect(wrapper.find('[data-sheet]').exists()).toBe(false)
      expect(navigateToMock).not.toHaveBeenCalled()
    })
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
      session.loggedIn.value = true
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

    it('fetches their review when the session arrives after the page did', async () => {
      session.loggedIn.value = false
      const wrapper = await mountSection()
      expect(userReviewRequests()).toEqual([])

      session.loggedIn.value = true
      await vi.waitFor(() => expect(writeButton(wrapper, 'Ενημέρωση κριτικής')).toBeDefined())

      expect(userReviewRequests()).toHaveLength(1)
    })

    it('can still write one when their own review could not be fetched', async () => {
      api.routes({ '/api/products/reviews/42/user-product-review': failWith(404) })
      const wrapper = await mountSection()

      await vi.waitFor(() => expect(writeButton(wrapper, 'Γράψε κριτική')).toBeDefined())
    })

    it('fetches nothing of their own when the store has reviews off', async () => {
      setTenantFeatures({ productReviews: false })

      await mountSection()

      expect(userReviewRequests()).toEqual([])
    })
  })
})
