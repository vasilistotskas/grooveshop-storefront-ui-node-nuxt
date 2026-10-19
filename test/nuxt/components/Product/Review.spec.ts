import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import type { ProductReviewDetail } from '~~/shared/openapi/types.gen'
import Review from '~/components/Product/Review.vue'
import { FIXTURE_TIMESTAMP, fixtureUuid, makeProduct } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const { toastAdd, viewport, mockLog } = vi.hoisted(() => ({
  toastAdd: vi.fn(),
  viewport: { phone: false },
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
mockNuxtImport('log', () => mockLog)
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))
// The sheet is chosen by the viewport, not the user agent.
mockNuxtImport('useDevice', () => () => ({
  isMobile: ref(viewport.phone),
  isMobileOrTablet: ref(viewport.phone),
  isDesktop: ref(!viewport.phone),
}))

const PRODUCT = makeProduct({ id: 1 })

const REVIEW: ProductReviewDetail = {
  id: 9,
  product: PRODUCT,
  user: { id: 7, username: null, firstName: 'Μαρία', lastName: 'Παπαδοπούλου', mainImagePath: '' },
  rate: 6,
  isVerifiedPurchase: false,
  status: 'TRUE',
  isPublished: true,
  createdAt: FIXTURE_TIMESTAMP,
  updatedAt: FIXTURE_TIMESTAMP,
  publishedAt: FIXTURE_TIMESTAMP,
  uuid: fixtureUuid(10, 9),
  translations: { el: { comment: 'Καλή γλάστρα, γερή.' } },
}
const UPDATED: ProductReviewDetail = { ...REVIEW, rate: 7 }

// A refusal rejects the way ofetch's FetchError does: the proxied
// error body on `data`.
const refused = (data: unknown) => failWith(400, data)

/**
 * Both stubs render their slots in place while open; the sheet stub says
 * which way it opens, so a test can tell a phone's sheet from a dialog.
 */
const Dialog = {
  props: ['open', 'title', 'description', 'ui'],
  template: '<div v-if="open" data-testid="modal"><slot name="body" /><div data-testid="footer"><slot name="footer" /></div></div>',
}
const Sheet = {
  props: ['open', 'title', 'description', 'ui', 'direction', 'handle'],
  template: '<div v-if="open" data-testid="sheet" :data-direction="direction"><slot name="body" /><div data-testid="footer"><slot name="footer" /></div></div>',
}

const COMMENT = 'Πολύ καλή ποιότητα, το συνιστώ.'

const mountSheet = async (props: { userHadReviewed?: boolean, userProductReview?: ProductReviewDetail } = {}) => {
  const wrapper = await mountSuspended(Review, {
    props: {
      'product': PRODUCT,
      'productName': 'Γλάστρα',
      'open': true,
      'onUpdate:open': (open: boolean | undefined): void => { void wrapper.setProps({ open }) },
      ...props,
    },
    global: { stubs: { UModal: Dialog, UDrawer: Sheet } },
    route: false,
  })
  return wrapper
}
type Wrapper = Awaited<ReturnType<typeof mountSheet>>

/** Click the star for `stars` (half steps allowed). */
const rate = (wrapper: Wrapper, stars: number) =>
  wrapper.get(`button[role="radio"][value="${stars}"]`).trigger('click')
const footerButton = (wrapper: Wrapper, label: string) =>
  wrapper.get('[data-testid="footer"]').findAll('button').find(b => b.text() === label)
/** Submit as the footer's submit button does (its `form` attribute). */
const submit = async (wrapper: Wrapper, label: string) => {
  const button = footerButton(wrapper, label)!
  const form = wrapper.get('form')
  expect(button.attributes('type')).toBe('submit')
  expect(button.attributes('form')).toBe(form.attributes('id'))
  await form.trigger('submit')
  await flushPromises()
}

describe('Product/Review', () => {
  it('is a dialog on a desktop and a bottom sheet on a phone', async () => {
    viewport.phone = false
    const desktop = await mountSheet()
    expect(desktop.find('[data-testid="modal"]').exists()).toBe(true)
    expect(desktop.find('[data-testid="sheet"]').exists()).toBe(false)

    viewport.phone = true
    const phone = await mountSheet()
    expect(phone.get('[data-testid="sheet"]').attributes('data-direction')).toBe('bottom')
    expect(phone.find('[data-testid="modal"]').exists()).toBe(false)
    viewport.phone = false
  })

  it('rates in half stars on the model\'s 1..10, naming the rating in words', async () => {
    api.routes({ '/api/products/reviews': { ...REVIEW, rate: 7 } })
    const wrapper = await mountSheet()

    await rate(wrapper, 3.5)
    expect(wrapper.get('[aria-live="polite"]').text()).toBe('Καλό')
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

  it('makes each star big enough for a thumb', async () => {
    const wrapper = await mountSheet()

    // The class is the contract: 52 px a star, five across a 320 px sheet.
    expect(wrapper.get('[role="radiogroup"] label').classes()).toContain('size-13')
  })

  it('says before it is sent that the review is checked before it appears', async () => {
    const wrapper = await mountSheet()

    expect(wrapper.text()).toContain('Οι κριτικές ελέγχονται πριν δημοσιευτούν. Η δική σου θα εμφανιστεί μόλις εγκριθεί.')
  })

  it('says an edit is checked again, and where the review stands now', async () => {
    const wrapper = await mountSheet({ userHadReviewed: true, userProductReview: { ...REVIEW, status: 'NEW' } })

    expect(wrapper.text()).toContain('Αν την αλλάξεις, η κριτική θα ελεγχθεί ξανά πριν εμφανιστεί.')
    expect(wrapper.text()).toContain('Σε έλεγχο')
  })

  it('asks for a rating and a 10-character comment before sending anything', async () => {
    const wrapper = await mountSheet()

    await wrapper.get('textarea').setValue('Καλό')
    await submit(wrapper, 'Υποβολή κριτικής')

    const { t } = useNuxtApp().$i18n
    expect(api.callsTo('/api/products/reviews')).toHaveLength(0)
    expect(wrapper.text()).toContain(t('validation.required'))
    expect(wrapper.text()).toContain(t('validation.min', { min: 10 }))
  })

  // Django refuses with a stable code beside a sentence in the page's
  // language; the shopper is told by the code, never by comparing text. The
  // refusal reaches the component forwarded (`error.data` is the body) or
  // thrown by the route (`error.data.data` is).
  const REFUSAL = (sentence: string) => ({
    product: sentence,
    code: 'must_have_purchased',
    fields: { product: [{ message: sentence, code: 'must_have_purchased' }] },
  })
  it.each([
    ['forwarded, in Greek', REFUSAL('Πρέπει να έχετε αγοράσει το προϊόν για να το αξιολογήσετε.')],
    ['forwarded, in English', REFUSAL('You must have bought the product to review it.')],
    ['thrown by the route', { statusCode: 400, statusMessage: 'Bad Request', data: REFUSAL('You must have bought the product.') }],
  ])('tells a shopper who has not bought the product why the review was refused (%s)', async (_shape, body) => {
    api.routes({ '/api/products/reviews': refused(body) })
    const wrapper = await mountSheet()

    await rate(wrapper, 4)
    await wrapper.get('textarea').setValue(COMMENT)
    await submit(wrapper, 'Υποβολή κριτικής')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({
      id: 'review:create',
      title: 'Η κριτική δεν δημιουργήθηκε',
      description: 'Μπορείς να γράψεις κριτική μόνο για προϊόντα που έχεις αγοράσει.',
      color: 'error',
    }))
    expect(wrapper.emitted('add-existing-review')).toBeUndefined()
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(true)
  })

  it('shows the reason Django gave for a refusal it has no mapping for', async () => {
    api.routes({ '/api/products/reviews': refused({ detail: 'Η κριτική απορρίφθηκε.', code: 'review_rejected' }) })
    const wrapper = await mountSheet()

    await rate(wrapper, 4)
    await wrapper.get('textarea').setValue(COMMENT)
    await submit(wrapper, 'Υποβολή κριτικής')

    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ description: 'Η κριτική απορρίφθηκε.' }))
  })

  it('settles a refused submit instead of throwing it at the form', async () => {
    api.routes({ '/api/products/reviews': failWith(500) })
    const wrapper = await mountSheet()
    const onSubmit = wrapper.findComponent({ name: 'UForm' }).props('onSubmit')

    // UForm rethrows whatever its handler throws, into Vue's error handler.
    await expect(onSubmit({ data: { rate: 8, comment: COMMENT } })).resolves.toBeUndefined()
    expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Η κριτική δεν δημιουργήθηκε', color: 'error' }))
  })

  it('logs the request id of the refused submit, to join the report to the server and Django lines', async () => {
    api.routes({
      '/api/products/reviews': () => {
        throw Object.assign(new Error('Bad Request'), { statusCode: 400, response: { headers: new Headers({ 'x-request-id': 'req-4242' }) } })
      },
    })
    const wrapper = await mountSheet()
    const onSubmit = wrapper.findComponent({ name: 'UForm' }).props('onSubmit')

    await onSubmit({ data: { rate: 8, comment: COMMENT } })

    expect(mockLog.error).toHaveBeenCalledWith(expect.objectContaining({ action: 'review:create', requestId: 'req-4242' }))
  })

  it('holds the form and shows the submit as busy while the review is on its way', async () => {
    const reply = Promise.withResolvers<unknown>()
    api.routes({ '/api/products/reviews': () => reply.promise })
    const wrapper = await mountSheet()
    await rate(wrapper, 4)
    await wrapper.get('textarea').setValue(COMMENT)

    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(footerButton(wrapper, 'Υποβολή κριτικής')!.attributes('disabled')).toBeDefined()
    expect(footerButton(wrapper, 'Άκυρο')!.attributes('disabled')).toBeDefined()
    expect(wrapper.get('textarea').attributes('disabled')).toBeDefined()

    reply.resolve({ ...REVIEW, rate: 8 })
    await flushPromises()
    expect(wrapper.find('[data-testid="modal"]').exists()).toBe(false)
  })

  describe('an existing review', () => {
    it('starts from the review and updates it in place', async () => {
      api.routes({ '/api/products/reviews/9': UPDATED })
      const wrapper = await mountSheet({ userHadReviewed: true, userProductReview: REVIEW })

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

    it.each([
      ['went back to approval', 'NEW', 'Η κριτική σου ενημερώθηκε και θα εμφανιστεί ξανά μόλις εγκριθεί'],
      ['stayed published', 'TRUE', 'Η κριτική σου ενημερώθηκε'],
    ] as const)('says so when the edit %s', async (_what, status, title) => {
      api.routes({ '/api/products/reviews/9': { ...UPDATED, status } })
      const wrapper = await mountSheet({ userHadReviewed: true, userProductReview: REVIEW })

      await submit(wrapper, 'Ενημέρωση κριτικής')

      expect(toastAdd).toHaveBeenCalledWith({ title, color: 'success' })
    })

    it('says so when an update is refused, and reports nothing to the page', async () => {
      api.routes({ '/api/products/reviews/9': failWith(400) })
      const wrapper = await mountSheet({ userHadReviewed: true, userProductReview: REVIEW })

      await submit(wrapper, 'Ενημέρωση κριτικής')

      expect(toastAdd).toHaveBeenCalledTimes(1)
      expect(toastAdd.mock.calls[0]![0]).toMatchObject({ color: 'error' })
      expect(wrapper.emitted('update-existing-review')).toBeUndefined()
    })

    it('asks once more before it deletes, and deletes nothing until it is told to', async () => {
      api.routes({ '/api/products/reviews/9': () => undefined })
      const wrapper = await mountSheet({ userHadReviewed: true, userProductReview: REVIEW })

      await footerButton(wrapper, 'Διαγραφή κριτικής')!.trigger('click')
      expect(wrapper.get('[data-testid="footer"]').text()).toContain('Να διαγραφεί η κριτική σου;')
      expect(api.callsTo('/api/products/reviews/9')).toHaveLength(0)

      // Keeping it goes back to the form's own buttons.
      await footerButton(wrapper, 'Όχι, κράτα την')!.trigger('click')
      expect(footerButton(wrapper, 'Ενημέρωση κριτικής')).toBeDefined()
      expect(api.callsTo('/api/products/reviews/9')).toHaveLength(0)

      await footerButton(wrapper, 'Διαγραφή κριτικής')!.trigger('click')
      await footerButton(wrapper, 'Ναι, διαγραφή')!.trigger('click')
      await flushPromises()

      expect(api.callsTo('/api/products/reviews/9')).toEqual([
        { url: '/api/products/reviews/9', options: expect.objectContaining({ method: 'DELETE' }) },
      ])
      expect(wrapper.emitted('delete-existing-review')).toEqual([[REVIEW]])
      expect(toastAdd).toHaveBeenCalledWith({ title: 'Η κριτική σου διαγράφηκε', color: 'success' })
    })

    it('keeps the review and the form when the delete is refused', async () => {
      api.routes({ '/api/products/reviews/9': failWith(500) })
      const wrapper = await mountSheet({ userHadReviewed: true, userProductReview: REVIEW })

      await footerButton(wrapper, 'Διαγραφή κριτικής')!.trigger('click')
      await footerButton(wrapper, 'Ναι, διαγραφή')!.trigger('click')
      await flushPromises()

      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: 'Η κριτική δεν διαγράφηκε', color: 'error' }))
      expect(wrapper.emitted('delete-existing-review')).toBeUndefined()
      expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('Καλή γλάστρα, γερή.')
    })
  })

  it('offers no delete before there is a review', async () => {
    const wrapper = await mountSheet()

    expect(footerButton(wrapper, 'Διαγραφή κριτικής')).toBeUndefined()
  })
})
