import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { defineComponent, h } from 'vue'
import GiftItem from '~/components/Checkout/GiftItem.vue'

/**
 * An earned free gift as a row of the summary's charges: the product,
 * not the promotion's internal name, and "Free" beside it.
 */
type Gift = InstanceType<typeof GiftItem>['$props']['gift']

// The row is a `<div>` of `<dt>` + `<dd>`: it renders inside the summary's `<dl>`.
const mount = (gift: Gift) => mountSuspended(defineComponent({
  setup: () => () => h('dl', [h(GiftItem, { gift })]),
}), { route: false })

describe('Checkout/GiftItem', () => {
  it('names the product as a free gift, with the offer it comes from', async () => {
    const wrapper = await mount({ promotionId: 1, name: 'Δώρο καλωσορίσματος', productId: 9, productName: 'Κούπα', quantity: 1 })

    expect(wrapper.get('dt').text()).toBe('Δώρο Κούπα')
    expect(wrapper.get('dd').text()).toBe('Δωρεάν')
    expect(wrapper.get('div').attributes('title')).toBe('Από την προσφορά «Δώρο καλωσορίσματος»')
  })

  it('counts more than one', async () => {
    const wrapper = await mount({ productName: 'Κούπα', quantity: 2 })

    expect(wrapper.get('dt').text()).toBe('Δώρο Κούπα ×2')
  })

  it('falls back on the offer\'s name when the product has none', async () => {
    const wrapper = await mount({ name: 'Έκπληξη' })

    expect(wrapper.get('dt').text()).toBe('Δώρο Έκπληξη')
  })
})
