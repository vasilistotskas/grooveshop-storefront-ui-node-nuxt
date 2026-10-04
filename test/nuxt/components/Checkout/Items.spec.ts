import { beforeEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Items from '~/components/Checkout/Items.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'

/**
 * The order summary's lines: each product's photograph and name linking
 * to it, the quantity, and the line's price.
 */
const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

describe('Checkout/Items', () => {
  beforeEach(() => {
    useCartStore().cart = makeCart({
      items: [
        { id: 1, quantity: 1, totalPrice: 12.5, product: { id: 11, slug: 'kouti' } },
        { id: 2, quantity: 3, totalPrice: 30, product: { id: 12, slug: 'koupa' } },
      ],
    })
  })

  it('lists each line with its quantity and price', async () => {
    const wrapper = await mountSuspended(Items, { route: false })

    const lines = wrapper.findAll('li')
    expect(lines).toHaveLength(2)
    expect(lines[1]!.text()).toContain('Ποσότητα: 3')
    expect(lines[1]!.text()).toContain(money(30))
    expect(lines[0]!.text()).toContain(money(12.5))
  })

  it('links the photograph and the name to the product', async () => {
    const wrapper = await mountSuspended(Items, { route: false })

    const hrefs = wrapper.findAll('li')[1]!.findAll('a').map(a => a.attributes('href'))
    expect(hrefs).toHaveLength(2)
    expect(new Set(hrefs).size).toBe(1)
    expect(hrefs[0]).toContain('/products/12/koupa')
  })

  it('renders nothing for an empty cart', async () => {
    useCartStore().cart = makeCart({ items: [] })

    const wrapper = await mountSuspended(Items, { route: false })

    expect(wrapper.find('ul').exists()).toBe(false)
  })
})
