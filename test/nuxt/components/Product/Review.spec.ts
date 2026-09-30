import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ProductReviewDetail, UserDetails } from '~~/shared/openapi/types.gen'
import Review from '~/components/Product/Review.vue'
import WebsideReview from '~/components/variants/webside/Product/Review.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from '~~/test/fixtures/product'
import { makeUserDetails } from '~~/test/fixtures/user'
import { trees } from '~~/test/helpers/trees'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd } = vi.hoisted(() => ({ toastAdd: vi.fn() }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

const PRODUCT = makeProduct({ id: 1 })

const USER: UserDetails = makeUserDetails({
  id: 7,
  email: 'maria@example.com',
  firstName: 'Μαρία',
  lastName: 'Παπαδοπούλου',
})

const REVIEW: ProductReviewDetail = {
  id: 9,
  product: PRODUCT,
  user: { id: 7, username: null, firstName: 'Μαρία', lastName: 'Παπαδοπούλου', mainImagePath: '' },
  rate: 6,
  status: 'NEW',
  isPublished: false,
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  publishedAt: null,
  uuid: fixtureUuid(10, 9),
  translations: { el: { comment: 'Καλή γλάστρα, γερή.' } },
}

/**
 * The review calls `$api` with ofetch `onResponse` / `onResponseError`
 * hooks and acts inside them, so a route answers by calling the hook
 * ofetch would call. ofetch then also rejects; the component does not
 * catch that rejection (reported as a bug), so the error route stops at
 * the hook rather than surface it as an unhandled rejection here.
 */
const respondOk = (_url: string, options: any) => options.onResponse?.({ response: { ok: true } })
const respondError = (data: unknown) => (_url: string, options: any) => {
  options.onResponseError?.({ response: { _data: data } })
}

// The modal's open/close is Nuxt UI's; the stub renders its slots in
// place while it is open, so the form and its footer are reachable.
const UModal = {
  props: ['open', 'title', 'fullscreen'],
  template: '<div v-if="open" data-testid="modal"><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
}

describe.each(trees(Review, WebsideReview))('$tree Product/Review', ({ C }) => {
  const mountReview = async (props: { user?: UserDetails, userHadReviewed?: boolean, userProductReview?: ProductReviewDetail } = {}) => {
    const wrapper = await mountSuspended(C, {
      props: { product: PRODUCT, user: USER, modelValue: true, ...props },
      global: { stubs: { UModal } },
      route: false,
    })
    return wrapper
  }
  type Wrapper = Awaited<ReturnType<typeof mountReview>>

  const slider = (wrapper: Wrapper) => wrapper.get('[role="slider"]')
  const rateWithKeys = async (wrapper: Wrapper, key: string, times: number) => {
    for (let i = 0; i < times; i++) await slider(wrapper).trigger('keydown', { key })
  }
  const button = (wrapper: Wrapper, label: string) => {
    const found = wrapper.findAll('button').filter(b => b.text() === label)
    expect(found).toHaveLength(1)
    return found[0]!
  }
  const submit = async (wrapper: Wrapper, label: string) => {
    await button(wrapper, label).trigger('click')
    await flushPromises()
  }

  it('renders nothing without a signed-in user', async () => {
    const wrapper = await mountReview({ user: undefined })

    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
  })

  it('rates from the keyboard, clamped to 0..10', async () => {
    const wrapper = await mountReview()

    await rateWithKeys(wrapper, 'ArrowRight', 3)
    expect(slider(wrapper).attributes('aria-valuenow')).toBe('3')
    await slider(wrapper).trigger('keydown', { key: 'PageUp' })
    expect(slider(wrapper).attributes('aria-valuenow')).toBe('5')
    await slider(wrapper).trigger('keydown', { key: 'End' })
    await rateWithKeys(wrapper, 'ArrowUp', 2)
    expect(slider(wrapper).attributes('aria-valuenow')).toBe('10')
    await slider(wrapper).trigger('keydown', { key: 'Home' })
    await rateWithKeys(wrapper, 'ArrowLeft', 1)
    expect(slider(wrapper).attributes('aria-valuenow')).toBe('0')
  })

  it('creates a review in the page language and reports it to the page', async () => {
    api.routes({ '/api/products/reviews': respondOk })
    const wrapper = await mountReview()

    await rateWithKeys(wrapper, 'ArrowRight', 8)
    await wrapper.get('textarea').setValue('Πολύ καλή ποιότητα, το συνιστώ.')
    await submit(wrapper, 'Γράψε μια κριτική')

    expect(api.callsTo('/api/products/reviews')).toEqual([{
      url: '/api/products/reviews',
      options: expect.objectContaining({
        method: 'POST',
        body: { product: 1, translations: { el: { comment: 'Πολύ καλή ποιότητα, το συνιστώ.' } }, rate: 8 },
      }),
    }])
    expect(wrapper.emitted('add-existing-review')).toHaveLength(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η κριτική δημιουργήθηκε με επιτυχία', color: 'success' })
  })

  it('sends nothing while the comment is shorter than 10 characters or there is no rating', async () => {
    const wrapper = await mountReview()

    await wrapper.get('textarea').setValue('Καλό')
    await submit(wrapper, 'Γράψε μια κριτική')

    expect(api.callsTo('/api/products/reviews')).toHaveLength(0)
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.min', { min: 10 }))
  })

  // The refusal arrives through the Nitro proxy (`data.product`) or
  // straight from DRF (`product`), as a code or a list of codes.
  it.each([
    ['a proxied list of codes', { data: { product: ['must_have_purchased'] } }],
    ['a proxied single code', { data: { product: 'must_have_purchased' } }],
    ['a bare DRF list of codes', { product: ['must_have_purchased'] }],
  ])('tells a shopper who has not bought the product why the review was refused (%s)', async (_shape, body) => {
    api.routes({ '/api/products/reviews': respondError(body) })
    const wrapper = await mountReview()

    await rateWithKeys(wrapper, 'ArrowRight', 8)
    await wrapper.get('textarea').setValue('Πολύ καλή ποιότητα, το συνιστώ.')
    await submit(wrapper, 'Γράψε μια κριτική')

    expect(toastAdd).toHaveBeenCalledWith({
      title: 'Μπορείς να γράψεις κριτική μόνο για προϊόντα που έχεις αγοράσει',
      color: 'error',
    })
    expect(wrapper.emitted('add-existing-review')).toBeUndefined()
  })

  it('reports any other refusal generically', async () => {
    api.routes({ '/api/products/reviews': respondError({ data: { comment: ['too_long'] } }) })
    const wrapper = await mountReview()

    await rateWithKeys(wrapper, 'ArrowRight', 8)
    await wrapper.get('textarea').setValue('Πολύ καλή ποιότητα, το συνιστώ.')
    await submit(wrapper, 'Γράψε μια κριτική')

    expect(toastAdd).toHaveBeenCalledWith({ title: 'Σφάλμα δημιουργίας σχολίου', color: 'error' })
  })

  it('starts from the existing review and updates it in place', async () => {
    api.routes({ '/api/products/reviews/9': respondOk })
    const wrapper = await mountReview({ userHadReviewed: true, userProductReview: REVIEW })

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Καλή γλάστρα, γερή.')
    expect(slider(wrapper).attributes('aria-valuenow')).toBe('6')

    await rateWithKeys(wrapper, 'ArrowRight', 1)
    await submit(wrapper, 'Ενημέρωση κριτικής')

    expect(api.callsTo('/api/products/reviews/9')).toEqual([{
      url: '/api/products/reviews/9',
      options: expect.objectContaining({
        method: 'PUT',
        body: { product: 1, translations: { el: { comment: 'Καλή γλάστρα, γερή.' } }, rate: 7 },
      }),
    }])
    expect(wrapper.emitted('update-existing-review')).toEqual([[REVIEW]])
  })

  it('deletes the review and clears the form', async () => {
    api.routes({ '/api/products/reviews/9': respondOk })
    const wrapper = await mountReview({ userHadReviewed: true, userProductReview: REVIEW })

    await submit(wrapper, 'Διαγραφή κριτικής')

    expect(api.callsTo('/api/products/reviews/9')).toEqual([
      { url: '/api/products/reviews/9', options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(wrapper.emitted('delete-existing-review')).toEqual([[REVIEW]])
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(slider(wrapper).attributes('aria-valuenow')).toBe('0')
  })

  it('offers no delete before there is a review', async () => {
    const wrapper = await mountReview()

    expect(wrapper.findAll('button').filter(b => b.text() === 'Διαγραφή κριτικής')).toHaveLength(0)
  })
})
