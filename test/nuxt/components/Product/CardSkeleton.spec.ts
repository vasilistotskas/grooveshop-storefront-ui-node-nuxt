import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ProductCardSkeleton from '~/components/Product/CardSkeleton.vue'

/**
 * The skeleton exists to hold the card's space, so what is worth
 * asserting is that it IS a card-shaped hole: the same element, the
 * same frame, the same reserved image. Its internal rows are styling
 * and change with the design — the parity guard in
 * `test/unit/components/Product/card-skeleton-parity.spec.ts` is what
 * stops the two drifting apart.
 */
describe('ProductCardSkeleton', () => {
  it('is a list item, like the card it stands in for', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)

    expect(wrapper.element.tagName).toBe('LI')
  })

  it('follows the card out of a list', async () => {
    // A carousel slide and a plain grid are not lists; an `<li>` with
    // no list parent is invalid and is announced as a list of one.
    const wrapper = await mountSuspended(ProductCardSkeleton, {
      props: { as: 'div' },
    })

    expect(wrapper.element.tagName).toBe('DIV')
  })

  it('reserves every row of the card, not just a box', async () => {
    const wrapper = await mountSuspended(ProductCardSkeleton)

    // Image, brand, two title lines, rating, price, button.
    const skeletons = wrapper.findAllComponents({ name: 'USkeleton' })
    expect(skeletons.length).toBeGreaterThanOrEqual(8)
  })
})
