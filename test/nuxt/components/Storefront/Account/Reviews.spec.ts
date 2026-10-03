import { describe, it, expect, beforeEach, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import ReviewsPage from '~/components/Storefront/Account/Reviews.vue'
import { makeProduct, makeProductReview } from '~~/test/fixtures/product'

/**
 * The shopper's reviews: one row each with where moderation stands, an
 * edit through the product page's own review dialog (with the review as
 * that page fetches it), and delete.
 */
const state = vi.hoisted(() => ({ reviews: [] as unknown[] }))
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('useRoute', () => () => ({ name: 'account-reviews___el', params: {}, query: {}, path: '/account/reviews', fullPath: '/account/reviews', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(true),
  user: ref({ id: 7 }),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

/** The dialog has its own spec; here it shows what it was opened with and can report an update. */
const DialogStub = defineComponent({
  props: { open: Boolean, userProductReview: { type: Object, default: null }, product: { type: Object, required: true } },
  emits: ['update:open', 'update-existing-review', 'delete-existing-review'],
  setup(props, { emit }) {
    return () => props.open
      ? h('div', { 'data-dialog': String((props.userProductReview as { id: number }).id) }, [
          h('button', { 'data-save': '', 'onClick': () => emit('update-existing-review') }),
        ])
      : null
  },
})

let fetches = 0

beforeEach(() => {
  fetches = 0
  state.reviews = [
    makeProductReview({ id: 1, status: 'TRUE', product: { id: 41, name: 'Φορτιστής GaN', slug: 'gan', mainImagePath: '' } }),
    makeProductReview({ id: 2, status: 'NEW' }),
    makeProductReview({ id: 3, status: 'FALSE' }),
  ]
  clearNuxtData('account-reviews-7')
  registerEndpoint('/api/user/account/7/product-reviews', () => {
    fetches++
    return { count: state.reviews.length, results: state.reviews }
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(ReviewsPage, { global: { stubs: { ProductReview: DialogStub } } })
  await flushPromises()
  return wrapper
}

const rows = (wrapper: Awaited<ReturnType<typeof mountPage>>) => wrapper.findAll('ul > li')

describe('Storefront/Account/Reviews', () => {
  it('says where moderation stands for each review', async () => {
    const wrapper = await mountPage()

    expect(rows(wrapper).map(row => row.findComponent({ name: 'UBadge' }).text())).toEqual(['Δημοσιευμένη', 'Σε έλεγχο', 'Δεν δημοσιεύτηκε'])
    expect(rows(wrapper)[0]!.text()).toContain('Φορτιστής GaN')
  })

  it('edits a review in the product page\'s dialog, with the review that page fetches', async () => {
    api.routes({ '/api/products/reviews/41/user-product-review': { ...makeProductReview({ id: 1 }), product: makeProduct({ id: 41 }) } })
    const wrapper = await mountPage()

    await rows(wrapper)[0]!.findAll('button').find(button => button.text() === 'Επεξεργασία')!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/products/reviews/41/user-product-review')).toHaveLength(1)
    expect(wrapper.get('[data-dialog]').attributes('data-dialog')).toBe('1')
  })

  it('reloads the list once the dialog saves', async () => {
    api.routes({ '/api/products/reviews/41/user-product-review': { ...makeProductReview({ id: 1 }), product: makeProduct({ id: 41 }) } })
    const wrapper = await mountPage()
    await rows(wrapper)[0]!.findAll('button').find(button => button.text() === 'Επεξεργασία')!.trigger('click')
    await flushPromises()
    const before = fetches

    await wrapper.get('[data-save]').trigger('click')
    await flushPromises()

    expect(fetches).toBe(before + 1)
  })

  it('deletes a review, then reloads the list', async () => {
    api.routes({ '/api/products/reviews/2': {} })
    const wrapper = await mountPage()
    const before = fetches

    await rows(wrapper)[1]!.findAll('button').find(button => button.attributes('aria-label')?.startsWith('Διαγραφή'))!.trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/products/reviews/2').map(call => call.options?.method)).toEqual(['DELETE'])
    expect(fetches).toBe(before + 1)
  })

  it('says so when there are no reviews yet', async () => {
    state.reviews = []

    expect((await mountPage()).text()).toContain('Καμία κριτική ακόμα')
  })
})
