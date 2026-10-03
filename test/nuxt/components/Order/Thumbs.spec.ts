import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import OrderThumbs from '~/components/Order/Thumbs.vue'
import { makeOrderItem } from '~~/test/fixtures/order'

/** An order's products as thumbnails: the first three, then "+N" for the rest. */
const itemsOf = (count: number) => Array.from({ length: count }, (_, index) => makeOrderItem({ id: index + 1 }))

describe('Order/Thumbs', () => {
  it('shows every product of a small order', async () => {
    const wrapper = await mountSuspended(OrderThumbs, { props: { items: itemsOf(2) } })

    expect(wrapper.findAll('img')).toHaveLength(2)
    expect(wrapper.text()).toBe('')
  })

  it('shows three and counts the rest', async () => {
    const wrapper = await mountSuspended(OrderThumbs, { props: { items: itemsOf(5) } })

    expect(wrapper.findAll('img')).toHaveLength(3)
    expect(wrapper.text()).toBe('+2')
  })

  it('leaves the images out of the accessible name: the row names the order', async () => {
    const wrapper = await mountSuspended(OrderThumbs, { props: { items: itemsOf(1) } })

    expect(wrapper.get('img').attributes('alt')).toBe('')
  })
})
