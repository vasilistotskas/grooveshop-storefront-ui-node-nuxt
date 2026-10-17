import { describe, it, expect, vi } from 'vitest'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { ListProductReviewsResponse, ProductReview } from '~~/shared/openapi/types.gen'
import List from '~/components/Product/Reviews/List.vue'
import { failWith } from '~~/test/helpers/api'
import { makeProductReview } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const reviews = (from: number, count: number): ProductReview[] =>
  Array.from({ length: count }, (_, i) => makeProductReview({ id: from + i }))

const page = (results: ProductReview[], total: number): ListProductReviewsResponse =>
  ({ count: total, links: {}, results })

const mountList = async (firstPage: ListProductReviewsResponse | null) => {
  const wrapper = await mountSuspended(List, { route: false, props: { productId: 42, firstPage } })
  await flushPromises()
  return wrapper
}
type Wrapper = Awaited<ReturnType<typeof mountList>>

const shown = (wrapper: Wrapper) => wrapper.findAll('article').map(article => article.text())
const button = (wrapper: Wrapper, label: string) => wrapper.findAll('button').find(b => b.text() === label)
const requests = () => api.callsTo('/api/products/42/reviews').map(call => call.options?.query)

describe('Product/Reviews/List', () => {
  it('shows three reviews, then the rest of the first page, then a page more per click', async () => {
    api.routes({ '/api/products/42/reviews': page(reviews(13, 2), 14) })
    const wrapper = await mountList(page(reviews(1, 12), 14))

    expect(shown(wrapper)).toHaveLength(3)

    await button(wrapper, 'Δες και τις 14 αξιολογήσεις')!.trigger('click')
    expect(shown(wrapper)).toHaveLength(12)
    expect(requests()).toEqual([])

    await button(wrapper, 'Περισσότερες αξιολογήσεις')!.trigger('click')
    await flushPromises()
    expect(requests()).toEqual([{ ordering: '-createdAt', page: 2 }])
    expect(shown(wrapper)).toHaveLength(14)
    expect(button(wrapper, 'Περισσότερες αξιολογήσεις')).toBeUndefined()
  })

  it('offers no way to show more when everything is already in view', async () => {
    const wrapper = await mountList(page(reviews(1, 3), 3))

    expect(shown(wrapper)).toHaveLength(3)
    expect(wrapper.findAll('button').filter(b => b.text().startsWith('Δες'))).toHaveLength(0)
  })

  it('offers no sort for a single review', async () => {
    const wrapper = await mountList(page(reviews(1, 1), 1))

    expect(wrapper.find('[role="combobox"]').exists()).toBe(false)
  })

  it.each([
    ['highest', '-rate,-createdAt'],
    ['lowest', 'rate,-createdAt'],
  ] as const)('asks the API for the %s reviews first when that sort is picked', async (sort, ordering) => {
    api.routes({ '/api/products/42/reviews': page([makeProductReview({ id: 99, translations: { el: { comment: 'Από το API' } } })], 5) })
    const wrapper = await mountList(page(reviews(1, 5), 5))

    await wrapper.getComponent({ name: 'USelect' }).vm.$emit('update:modelValue', sort)
    await flushPromises()

    expect(requests()).toEqual([{ ordering, page: 1 }])
    expect(shown(wrapper)).toEqual([expect.stringContaining('Από το API')])
  })

  it('goes back to the page\'s own first page, without asking again, for the default sort', async () => {
    api.routes({ '/api/products/42/reviews': page([makeProductReview({ id: 99 })], 5) })
    const wrapper = await mountList(page(reviews(1, 5), 5))
    const select = wrapper.getComponent({ name: 'USelect' })

    await select.vm.$emit('update:modelValue', 'highest')
    await flushPromises()
    await select.vm.$emit('update:modelValue', 'newest')
    await flushPromises()

    expect(requests()).toHaveLength(1)
    expect(shown(wrapper)).toHaveLength(3)
    expect(shown(wrapper)[0]).toContain('Κριτική 1')
  })

  it('drops the pages it had loaded when the product page refreshes the first one', async () => {
    api.routes({ '/api/products/42/reviews': page(reviews(13, 2), 14) })
    const wrapper = await mountList(page(reviews(1, 12), 14))
    await button(wrapper, 'Δες και τις 14 αξιολογήσεις')!.trigger('click')
    await button(wrapper, 'Περισσότερες αξιολογήσεις')!.trigger('click')
    await flushPromises()
    expect(shown(wrapper)).toHaveLength(14)

    await wrapper.setProps({ firstPage: page(reviews(30, 12), 14) })

    expect(shown(wrapper)).toHaveLength(12)
    expect(shown(wrapper)[0]).toContain('Κριτική 30')
  })

  it('says so, and tries again, when a page of reviews did not load', async () => {
    api.routes({ '/api/products/42/reviews': failWith(500) })
    const wrapper = await mountList(page(reviews(1, 12), 14))
    await button(wrapper, 'Δες και τις 14 αξιολογήσεις')!.trigger('click')
    await button(wrapper, 'Περισσότερες αξιολογήσεις')!.trigger('click')
    await flushPromises()

    expect(wrapper.get('[role="alert"]').text()).toContain('Οι αξιολογήσεις δεν φορτώθηκαν.')
    expect(shown(wrapper)).toHaveLength(12)
    // Retry replaces the show-more button while the error stands.
    expect(button(wrapper, 'Περισσότερες αξιολογήσεις')).toBeUndefined()

    api.routes({ '/api/products/42/reviews': page(reviews(13, 2), 14) })
    await button(wrapper, 'Δοκίμασε ξανά')!.trigger('click')
    await flushPromises()

    expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    expect(shown(wrapper)).toHaveLength(14)
  })

  it('says so, and tries the sort again, when the sorted reviews did not load', async () => {
    api.routes({ '/api/products/42/reviews': failWith(500) })
    const wrapper = await mountList(page(reviews(1, 5), 5))

    await wrapper.getComponent({ name: 'USelect' }).vm.$emit('update:modelValue', 'lowest')
    await flushPromises()
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)

    api.routes({ '/api/products/42/reviews': page([makeProductReview({ id: 77, translations: { el: { comment: 'Επιτέλους' } } })], 5) })
    await button(wrapper, 'Δοκίμασε ξανά')!.trigger('click')
    await flushPromises()

    expect(shown(wrapper)).toEqual([expect.stringContaining('Επιτέλους')])
  })
})
