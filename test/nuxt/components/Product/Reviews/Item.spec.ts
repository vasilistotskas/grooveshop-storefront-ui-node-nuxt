import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Item from '~/components/Product/Reviews/Item.vue'
import { makeProductReview } from '~~/test/fixtures/product'

const mountItem = (overrides: Parameters<typeof makeProductReview>[0] = {}) =>
  mountSuspended(Item, { route: false, props: { review: makeProductReview(overrides) } })

describe('Product/Reviews/Item', () => {
  it('badges a review from a verified purchase', async () => {
    const wrapper = await mountItem({ isVerifiedPurchase: true })

    expect(wrapper.text()).toContain('Επαληθευμένη αγορά')
  })

  it('leaves the badge off an unverified review', async () => {
    const wrapper = await mountItem({ isVerifiedPurchase: false })

    expect(wrapper.text()).not.toContain('Επαληθευμένη αγορά')
  })

  it('names the reviewer by first name and the initial of the last, never in full', async () => {
    const wrapper = await mountItem()

    expect(wrapper.text()).toContain('Μαρία Π.')
    expect(wrapper.html()).not.toContain('Παπαδοπούλου')
  })

  it('dates a review by when it was published, and by when it was written until then', async () => {
    const published = await mountItem({ publishedAt: '2026-03-02T10:00:00Z', createdAt: '2026-01-01T00:00:00Z' })
    const unpublished = await mountItem({ publishedAt: null, createdAt: '2026-01-01T00:00:00Z' })

    expect(published.get('time').attributes('datetime')).toBe('2026-03-02T10:00:00.000Z')
    expect(unpublished.get('time').attributes('datetime')).toBe('2026-01-01T00:00:00.000Z')
  })

  it('shows a comment written in another language, marked with it, when the page\'s has none', async () => {
    const wrapper = await mountItem({ translations: { en: { comment: 'Great pot, sturdy.' } } })

    const comment = wrapper.get('p')
    expect(comment.text()).toBe('Great pot, sturdy.')
    expect(comment.attributes('lang')).toBe('en')
  })

  describe('a long comment', () => {
    const LONG = `${'Πολύ καλό προϊόν. '.repeat(30)}Τέλος.`

    it('is cut to a few lines with a Read more that opens and closes it', async () => {
      const wrapper = await mountItem({ translations: { el: { comment: LONG } } })
      const toggle = () => wrapper.get('button[aria-controls]')

      expect(wrapper.get('p').classes()).toContain('line-clamp-4')
      expect(toggle().text()).toBe('Διάβασε περισσότερα')
      expect(toggle().attributes('aria-expanded')).toBe('false')

      await toggle().trigger('click')
      expect(wrapper.get('p').classes()).not.toContain('line-clamp-4')
      expect(toggle().text()).toBe('Διάβασε λιγότερα')
      expect(toggle().attributes('aria-expanded')).toBe('true')
      // The whole comment was in the page all along.
      expect(wrapper.get('p').text()).toBe(LONG.trim())
    })

    it('wraps only a token wider than the card, never every word', async () => {
      const wrapper = await mountItem({ translations: { el: { comment: LONG } } })

      // The class is the contract: `break-all` cut Greek words at the edge.
      expect(wrapper.get('p').classes()).toContain('wrap-anywhere')
      expect(wrapper.get('p').classes()).not.toContain('break-all')
    })
  })

  it('offers no Read more for a short comment', async () => {
    const wrapper = await mountItem({ translations: { el: { comment: 'Καλό.' } } })

    expect(wrapper.find('button[aria-controls]').exists()).toBe(false)
    expect(wrapper.get('p').classes()).not.toContain('line-clamp-4')
  })
})
