import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import ReviewsPage from '~/components/Storefront/Account/Reviews.vue'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'

/**
 * The shopper's reviews: one row each with where moderation stands, an
 * edit (and, in it, delete) through the product page's own review sheet
 * with the review as that page fetches it, newest or oldest first, and a
 * page at a time.
 */
const state = vi.hoisted(() => ({ reviews: [] as unknown[], total: undefined as number | undefined, failList: false }))
const route = vi.hoisted(() => ({ query: {} as Record<string, string> }))
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('useRoute', () => () => ({ name: 'account-reviews___el', params: {}, query: route.query, path: '/account/reviews', fullPath: '/account/reviews', hash: '', meta: {}, matched: [] }))
const navigateTo = vi.hoisted(() => vi.fn())
mockNuxtImport('navigateTo', () => navigateTo)
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

/**
 * The sheet has its own spec; here it shows what it was opened with and
 * can report a change. Nuxt turns `<LazyProductReview>` into a direct
 * import, so the module is replaced rather than a stub named.
 */
vi.mock('~/components/Product/Review.vue', async () => {
  const { defineComponent, h } = await import('vue')
  return {
    default: defineComponent({
      props: { open: Boolean, userProductReview: { type: Object, default: null }, product: { type: Object, required: true } },
      emits: ['update:open', 'update-existing-review', 'delete-existing-review'],
      setup(props, { emit }) {
        return () => props.open
          ? h('div', { 'data-dialog': String((props.userProductReview as { id: number }).id) }, [
              h('button', { 'data-save': '', 'onClick': () => emit('update-existing-review') }),
              h('button', { 'data-delete': '', 'onClick': () => emit('delete-existing-review') }),
            ])
          : null
      },
    }),
  }
})

let requests: Array<Record<string, string>> = []

beforeEach(() => {
  requests = []
  route.query = {}
  state.total = undefined
  state.reviews = [
    makeProductReview({ id: 1, status: 'TRUE', product: { id: 41, name: 'Φορτιστής GaN', slug: 'gan', mainImagePath: '' } }),
    makeProductReview({ id: 2, status: 'NEW' }),
    makeProductReview({ id: 3, status: 'FALSE' }),
  ]
  state.failList = false
  clearNuxtData('account-reviews-7')
  registerEndpoint('/api/user/account/7/product-reviews', (event) => {
    requests.push(Object.fromEntries(new URL(event.node.req.url ?? '', 'http://x').searchParams))
    if (state.failList) throw createError({ statusCode: 500 })
    return { count: state.total ?? state.reviews.length, results: state.reviews }
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(ReviewsPage, { route: false })
  await flushPromises()
  return wrapper
}

const rows = (wrapper: Awaited<ReturnType<typeof mountPage>>) => wrapper.findAll('ul > li')
// The stars are buttons too (a read-only rating still renders its radios).
const editButton = (row: ReturnType<typeof rows>[number]) => row.get('button[aria-label^="Επεξεργασία"]')

describe('Storefront/Account/Reviews', () => {
  it('says where moderation stands for each review', async () => {
    const wrapper = await mountPage()

    expect(rows(wrapper).map(row => row.findComponent({ name: 'UBadge' }).text())).toEqual(['Δημοσιευμένη', 'Σε έλεγχο', 'Δεν δημοσιεύτηκε'])
    expect(rows(wrapper)[0]!.text()).toContain('Φορτιστής GaN')
  })

  it('edits a review in the product page\'s sheet, with the review that page fetches', async () => {
    api.routes({ '/api/products/reviews/41/user-product-review': { ...makeProductReview({ id: 1 }), product: makeProduct({ id: 41 }) } })
    const wrapper = await mountPage()

    await editButton(rows(wrapper)[0]!).trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/products/reviews/41/user-product-review')).toHaveLength(1)
    await vi.waitFor(() => expect(wrapper.get('[data-dialog]').attributes('data-dialog')).toBe('1'))
  })

  it.each([
    ['saves', '[data-save]'],
    ['deletes', '[data-delete]'],
  ])('reloads the list once the sheet %s', async (_what, trigger) => {
    api.routes({ '/api/products/reviews/41/user-product-review': { ...makeProductReview({ id: 1 }), product: makeProduct({ id: 41 }) } })
    const wrapper = await mountPage()
    await editButton(rows(wrapper)[0]!).trigger('click')
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.find(trigger).exists()).toBe(true))
    const before = requests.length

    await wrapper.get(trigger).trigger('click')
    await flushPromises()

    expect(requests).toHaveLength(before + 1)
  })

  it('has no delete of its own: a delete is the sheet\'s, with its confirmation', async () => {
    const wrapper = await mountPage()

    expect(rows(wrapper)[0]!.findAll('button:not([role="radio"])').map(button => button.attributes('aria-label'))).toEqual([
      'Επεξεργασία της κριτικής για «Φορτιστής GaN»',
    ])
  })

  it('says so when a review did not open for editing', async () => {
    api.routes({ '/api/products/reviews/41/user-product-review': failWith(500) })
    const wrapper = await mountPage()

    await editButton(rows(wrapper)[0]!).trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-dialog]').exists()).toBe(false)
  })

  it('says so when there are no reviews yet, and points at the products', async () => {
    state.reviews = []

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('Καμία κριτική ακόμα')
    expect(wrapper.get('a[href$="/products"]').text()).toBe('Δες τα προϊόντα')
  })

  it('says the list did not load, rather than that there are no reviews, and tries again', async () => {
    state.failList = true
    const wrapper = await mountPage()

    expect(wrapper.get('[role="alert"]').text()).toContain('Οι κριτικές σου δεν φορτώθηκαν.')
    expect(wrapper.text()).not.toContain('Καμία κριτική ακόμα')

    state.failList = false
    await wrapper.get('[role="alert"] button').trigger('click')

    await vi.waitFor(() => expect(rows(wrapper)).toHaveLength(3))
  })

  describe('ordering', () => {
    it.each([
      ['asks for the newest first by default', {}, '-createdAt'],
      ['asks for the oldest first when the URL says so', { ordering: 'createdAt' }, 'createdAt'],
    ])('%s', async (_what, query, ordering) => {
      route.query = query
      await mountPage()

      expect(requests.map(request => request.ordering)).toEqual([ordering])
    })

    it('ignores an ordering the page does not offer', async () => {
      route.query = { ordering: 'password' }
      await mountPage()

      expect(requests.map(query => query.ordering)).toEqual(['-createdAt'])
    })

    it('moves to the first page of the other order through the URL', async () => {
      route.query = { page: '3' }
      state.total = 25
      const wrapper = await mountPage()

      await wrapper.getComponent({ name: 'USelect' }).vm.$emit('update:modelValue', 'createdAt')

      expect(navigateTo).toHaveBeenCalledWith({ query: { page: undefined, ordering: 'createdAt' } })
    })
  })

  describe('after the sheet deletes the last review of a page', () => {
    /** Opens the first review's sheet, lets the server change, then deletes. */
    const deleteWhen = async (wrapper: Awaited<ReturnType<typeof mountPage>>, serverChanges: () => void) => {
      api.routes({ '/api/products/reviews/41/user-product-review': { ...makeProductReview({ id: 1 }), product: makeProduct({ id: 41 }) } })
      await editButton(rows(wrapper)[0]!).trigger('click')
      await vi.waitFor(() => expect(wrapper.find('[data-delete]').exists()).toBe(true))
      serverChanges()
      navigateTo.mockClear()
      await wrapper.get('[data-delete]').trigger('click')
      await flushPromises()
    }

    it('goes back to the last page that still has reviews, not to "No reviews yet"', async () => {
      route.query = { page: '2', ordering: 'createdAt' }
      state.total = 11
      const wrapper = await mountPage()

      // The reload finds page 2 empty while ten reviews remain.
      await deleteWhen(wrapper, () => {
        state.reviews = []
        state.total = 10
      })

      await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith({ query: { ordering: 'createdAt', page: undefined } }))
    })

    it('goes straight to the last page that exists when several pages are gone', async () => {
      route.query = { page: '4' }
      state.total = 31
      const wrapper = await mountPage()

      await deleteWhen(wrapper, () => {
        state.reviews = []
        state.total = 10
      })

      await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith({ query: { page: undefined } }))
    })

    it('never stays on or moves past an empty page, whatever count the reload claims', async () => {
      route.query = { page: '2' }
      state.total = 11
      const wrapper = await mountPage()

      await deleteWhen(wrapper, () => {
        state.reviews = []
        state.total = 50
      })

      await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith({ query: { page: undefined } }))
    })

    it('steps back one page when the reload gives no count to compute from', async () => {
      route.query = { page: '3' }
      state.total = 21
      const wrapper = await mountPage()

      await deleteWhen(wrapper, () => {
        state.failList = true
      })

      await vi.waitFor(() => expect(navigateTo).toHaveBeenCalledWith({ query: { page: 2 } }))
    })

    it('stays where it is while the page still has reviews', async () => {
      route.query = { page: '2' }
      state.total = 15
      const wrapper = await mountPage()

      const before = requests.length

      await deleteWhen(wrapper, () => {
        state.total = 14
      })
      await vi.waitFor(() => expect(requests.length).toBeGreaterThan(before))

      expect(navigateTo).not.toHaveBeenCalled()
    })
  })

  it('pages through the URL once there are more than a page of reviews', async () => {
    state.total = 25
    route.query = { page: '2' }
    const wrapper = await mountPage()

    expect(requests[0]).toMatchObject({ page: '2', pageSize: '10' })
    expect(wrapper.findComponent({ name: 'UPagination' }).props('total')).toBe(25)
  })
})
