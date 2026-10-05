import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ProductReviewDetail, UserDetails } from '~~/shared/openapi/types.gen'
import Review from '~/components/Product/Review.vue'
import WebsideReview from '~/components/variants/webside/Product/Review.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from '~~/test/fixtures/product'
import { makeUserDetails } from '~~/test/fixtures/user'
import { failWith } from '~~/test/helpers/api'

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
  isVerifiedPurchase: false,
  status: 'NEW',
  isPublished: false,
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  publishedAt: null,
  uuid: fixtureUuid(10, 9),
  translations: { el: { comment: 'Καλή γλάστρα, γερή.' } },
}

// A refusal rejects the way ofetch's FetchError does: the proxied
// error body on `data`.
const refused = (data: unknown) => failWith(400, data)
const UPDATED: ProductReviewDetail = { ...REVIEW, rate: 7 }

// The modal's open/close is Nuxt UI's; the stub renders its slots in
// place while it is open, so the form and its footer are reachable.
const UModal = {
  props: ['open', 'title', 'fullscreen'],
  template: '<div v-if="open" data-testid="modal"><slot name="header" /><slot name="body" /><slot name="footer" /></div>',
}

/** The frozen copy, pinned as it renders on webside.gr. */
describe('webside Product/Review', () => {
  const C = WebsideReview
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
    api.routes({ '/api/products/reviews': { ...REVIEW, rate: 8 } })
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
    expect(wrapper.emitted('add-existing-review')).toEqual([[{ ...REVIEW, rate: 8 }]])
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η κριτική δημιουργήθηκε με επιτυχία', color: 'success' })
  })

  it('sends nothing while the comment is shorter than 10 characters or there is no rating', async () => {
    const wrapper = await mountReview()

    await wrapper.get('textarea').setValue('Καλό')
    await submit(wrapper, 'Γράψε μια κριτική')

    expect(api.callsTo('/api/products/reviews')).toHaveLength(0)
    expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('validation.min', { min: 10 }))
  })

  it('asks for a rating, not a length, when none is chosen', async () => {
    // The rating is a number from 0 to 10; with none chosen the field
    // used to say "at least 1 characters".
    const wrapper = await mountReview()

    await wrapper.get('textarea').setValue('Πολύ καλή ποιότητα, το συνιστώ.')
    await submit(wrapper, 'Γράψε μια κριτική')

    const { t } = useNuxtApp().$i18n
    expect(api.callsTo('/api/products/reviews')).toHaveLength(0)
    expect(wrapper.text()).toContain(t('validation.required'))
    expect(wrapper.text()).not.toContain(t('validation.min', { min: 1 }))
  })

  // The refusal arrives through the Nitro proxy (`data.product`) or
  // straight from DRF (`product`), as a code or a list of codes.
  it.each([
    ['a proxied list of codes', { data: { product: ['must_have_purchased'] } }],
    ['a proxied single code', { data: { product: 'must_have_purchased' } }],
    ['a bare DRF list of codes', { product: ['must_have_purchased'] }],
  ])('tells a shopper who has not bought the product why the review was refused (%s)', async (_shape, body) => {
    api.routes({ '/api/products/reviews': refused(body) })
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
    api.routes({ '/api/products/reviews': refused({ data: { comment: ['too_long'] } }) })
    const wrapper = await mountReview()

    await rateWithKeys(wrapper, 'ArrowRight', 8)
    await wrapper.get('textarea').setValue('Πολύ καλή ποιότητα, το συνιστώ.')
    await submit(wrapper, 'Γράψε μια κριτική')

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Σφάλμα δημιουργίας σχολίου', color: 'error' })
  })

  it('settles a refused submit instead of throwing it at the form', async () => {
    api.routes({ '/api/products/reviews': failWith(500) })
    const wrapper = await mountReview()
    const onSubmit = wrapper.findComponent({ name: 'UForm' }).props('onSubmit')

    // UForm rethrows whatever its handler throws, into Vue's error handler.
    await expect(onSubmit({ data: { rate: 8, comment: 'Πολύ καλή ποιότητα, το συνιστώ.' } })).resolves.toBeUndefined()
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Σφάλμα δημιουργίας σχολίου', color: 'error' })
  })

  it('starts from the existing review and updates it in place', async () => {
    api.routes({ '/api/products/reviews/9': UPDATED })
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
    expect(wrapper.emitted('update-existing-review')).toEqual([[UPDATED]])
  })

  it('says so when an update is refused, and reports nothing to the page', async () => {
    api.routes({ '/api/products/reviews/9': failWith(400) })
    const wrapper = await mountReview({ userHadReviewed: true, userProductReview: REVIEW })

    await submit(wrapper, 'Ενημέρωση κριτικής')

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd.mock.calls[0]![0]).toMatchObject({ color: 'error' })
    expect(wrapper.emitted('update-existing-review')).toBeUndefined()
  })

  it('deletes the review and clears the form', async () => {
    api.routes({ '/api/products/reviews/9': null })
    const wrapper = await mountReview({ userHadReviewed: true, userProductReview: REVIEW })

    await submit(wrapper, 'Διαγραφή κριτικής')

    expect(api.callsTo('/api/products/reviews/9')).toEqual([
      { url: '/api/products/reviews/9', options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(wrapper.emitted('delete-existing-review')).toEqual([[REVIEW]])
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(slider(wrapper).attributes('aria-valuenow')).toBe('0')
  })

  it('keeps the review and the form when the delete is refused', async () => {
    api.routes({ '/api/products/reviews/9': failWith(500) })
    const wrapper = await mountReview({ userHadReviewed: true, userProductReview: REVIEW })

    await submit(wrapper, 'Διαγραφή κριτικής')

    expect(toastAdd).toHaveBeenCalledTimes(1)
    expect(toastAdd.mock.calls[0]![0]).toMatchObject({ color: 'error' })
    expect(wrapper.emitted('delete-existing-review')).toBeUndefined()
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Καλή γλάστρα, γερή.')
  })

  it('offers no delete before there is a review', async () => {
    const wrapper = await mountReview()

    expect(wrapper.findAll('button').filter(b => b.text() === 'Διαγραφή κριτικής')).toHaveLength(0)
  })
})

/**
 * The Groove Volt review dialog: five stars in half steps — the model's
 * 1..10 as a reader counts it — and the comment, submitted from the
 * footer. The stub renders the body and the footer while it is open.
 */
describe('default Product/Review', () => {
  const Dialog = {
    props: ['open', 'title', 'description', 'ui'],
    template: '<div v-if="open" data-testid="modal"><slot name="body" /><div data-testid="footer"><slot name="footer" /></div></div>',
  }

  const mountDialog = async (props: { userHadReviewed?: boolean, userProductReview?: ProductReviewDetail } = {}) => {
    const wrapper = await mountSuspended(Review, {
      props: {
        'product': PRODUCT,
        'productName': 'Γλάστρα',
        'user': USER,
        'open': true,
        'onUpdate:open': (open: boolean | undefined): void => { void wrapper.setProps({ open }) },
        ...props,
      },
      global: { stubs: { UModal: Dialog } },
      route: false,
    })
    return wrapper
  }
  type Wrapper = Awaited<ReturnType<typeof mountDialog>>

  /** Click the star for `stars` (half steps allowed). */
  const rate = (wrapper: Wrapper, stars: number) =>
    wrapper.get(`button[role="radio"][value="${stars}"]`).trigger('click')
  const footerButton = (wrapper: Wrapper, label: string) =>
    wrapper.get('[data-testid="footer"]').findAll('button').find(b => b.text() === label)!
  /** Submit as the footer's submit button does (its `form` attribute). */
  const submit = async (wrapper: Wrapper, label: string) => {
    const button = footerButton(wrapper, label)
    const form = wrapper.get('form')
    expect(button.attributes('type')).toBe('submit')
    expect(button.attributes('form')).toBe(form.attributes('id'))
    await form.trigger('submit')
    await flushPromises()
  }
  const COMMENT = 'Πολύ καλή ποιότητα, το συνιστώ.'

  it('rates in half stars on the model\'s 1..10, naming the rating in words', async () => {
    api.routes({ '/api/products/reviews': { ...REVIEW, rate: 7 } })
    const wrapper = await mountDialog()

    await rate(wrapper, 3.5)
    expect(wrapper.text()).toContain('Καλό')
    await wrapper.get('textarea').setValue(COMMENT)
    await submit(wrapper, 'Υποβολή κριτικής')

    expect(api.callsTo('/api/products/reviews')).toEqual([{
      url: '/api/products/reviews',
      options: expect.objectContaining({
        method: 'POST',
        body: { product: 1, translations: { el: { comment: COMMENT } }, rate: 7 },
      }),
    }])
    expect(wrapper.emitted('add-existing-review')).toEqual([[{ ...REVIEW, rate: 7 }]])
    expect(toastAdd).toHaveBeenCalledWith({ title: 'Η κριτική σου στάλθηκε και θα εμφανιστεί μόλις εγκριθεί', color: 'success' })
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
  })

  it('says reviews are moderated', async () => {
    const wrapper = await mountDialog()

    expect(wrapper.text()).toContain('Οι κριτικές ελέγχονται πριν εμφανιστούν.')
  })

  it('asks for a rating and a 10-character comment before sending anything', async () => {
    const wrapper = await mountDialog()

    await wrapper.get('textarea').setValue('Καλό')
    await submit(wrapper, 'Υποβολή κριτικής')

    const { t } = useNuxtApp().$i18n
    expect(api.callsTo('/api/products/reviews')).toHaveLength(0)
    expect(wrapper.text()).toContain(t('validation.required'))
    expect(wrapper.text()).toContain(t('validation.min', { min: 10 }))
  })

  it.each([
    ['a proxied list of codes', { data: { product: ['must_have_purchased'] } }],
    ['a bare DRF list of codes', { product: ['must_have_purchased'] }],
  ])('tells a shopper who has not bought the product why the review was refused (%s)', async (_shape, body) => {
    api.routes({ '/api/products/reviews': refused(body) })
    const wrapper = await mountDialog()

    await rate(wrapper, 4)
    await wrapper.get('textarea').setValue(COMMENT)
    await submit(wrapper, 'Υποβολή κριτικής')

    expect(toastAdd).toHaveBeenCalledWith({
      title: 'Μπορείς να γράψεις κριτική μόνο για προϊόντα που έχεις αγοράσει',
      color: 'error',
    })
    expect(wrapper.emitted('add-existing-review')).toBeUndefined()
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
  })

  it('starts from the existing review and updates it in place', async () => {
    api.routes({ '/api/products/reviews/9': UPDATED })
    const wrapper = await mountDialog({ userHadReviewed: true, userProductReview: REVIEW })

    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Καλή γλάστρα, γερή.')
    // The stored 6 is three stars.
    expect(wrapper.get('button[role="radio"][value="3"]').attributes('aria-checked')).toBe('true')

    await rate(wrapper, 3.5)
    await submit(wrapper, 'Ενημέρωση κριτικής')

    expect(api.callsTo('/api/products/reviews/9')).toEqual([{
      url: '/api/products/reviews/9',
      options: expect.objectContaining({
        method: 'PUT',
        body: { product: 1, translations: { el: { comment: 'Καλή γλάστρα, γερή.' } }, rate: 7 },
      }),
    }])
    expect(wrapper.emitted('update-existing-review')).toEqual([[UPDATED]])
  })

  it('deletes the existing review, and offers no delete before there is one', async () => {
    const fresh = await mountDialog()
    expect(footerButton(fresh, 'Διαγραφή')).toBeUndefined()

    api.routes({ '/api/products/reviews/9': () => undefined })
    const wrapper = await mountDialog({ userHadReviewed: true, userProductReview: REVIEW })

    await footerButton(wrapper, 'Διαγραφή').trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/products/reviews/9')).toEqual([
      { url: '/api/products/reviews/9', options: expect.objectContaining({ method: 'DELETE' }) },
    ])
    expect(wrapper.emitted('delete-existing-review')).toEqual([[REVIEW]])
  })
})
