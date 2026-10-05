import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Item from '~/components/Product/Reviews/Item.vue'
import { makeProductReview } from '~~/test/fixtures/product'

describe('Product/Reviews/Item', () => {
  it('badges a review from a verified purchase', async () => {
    const wrapper = await mountSuspended(Item, {
      route: false,
      props: { review: makeProductReview({ isVerifiedPurchase: true }) },
    })

    expect(wrapper.text()).toContain('Επαληθευμένη αγορά')
  })

  it('leaves the badge off an unverified review', async () => {
    const wrapper = await mountSuspended(Item, {
      route: false,
      props: { review: makeProductReview({ isVerifiedPurchase: false }) },
    })

    expect(wrapper.text()).not.toContain('Επαληθευμένη αγορά')
  })
})
