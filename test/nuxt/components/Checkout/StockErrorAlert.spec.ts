import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import CheckoutStockErrorAlert from '~/components/Checkout/StockErrorAlert.vue'
import WebsideCheckoutStockErrorAlert from '~/components/variants/webside/Checkout/StockErrorAlert.vue'
import { trees } from '~~/test/helpers/trees'

/**
 * What the shopper sees when the stock reservation refuses the order:
 * each short line with how many were asked for and how many exist, a
 * way back to the cart, and a retry. The trees differ only in the
 * `en:` block.
 */
const STOCK_ERROR = {
  show: true,
  failedItems: [
    { productId: 1, productName: 'Καφετιέρα', requested: 5, available: 2 },
    { productId: 2, productName: 'Φίλτρα', requested: 4, available: 0 },
  ],
}

describe.each(trees(CheckoutStockErrorAlert, WebsideCheckoutStockErrorAlert))('$tree Checkout/StockErrorAlert', ({ C }) => {
  const mount = () => mountSuspended(C, { route: false, props: { stockError: STOCK_ERROR } })

  it('lists each short line with what was asked for, what exists and the shortfall', async () => {
    const wrapper = await mount()
    const text = wrapper.text()

    expect(text).toContain('Καφετιέρα')
    expect(text).toContain('Φίλτρα')
    // Both halves: a bare `|` is vue-i18n's plural separator, which had
    // cut the line to "Ζητήθηκαν: 5".
    expect(text).toContain('Ζητήθηκαν: 5 | Διαθέσιμα: 2')
    expect(text).toContain('Ζητήθηκαν: 4 | Διαθέσιμα: 0')
    expect(wrapper.findAllComponents({ name: 'UBadge' }).map(badge => badge.text())).toEqual(['-3', '-4'])
  })

  it('sends the shopper back to the cart to fix it', async () => {
    const wrapper = await mount()
    const link = wrapper.findAll('a').find(a => a.text() === 'Ενημέρωση Καλαθιού')

    expect(link?.attributes('href')).toBe('/cart')
  })

  it('asks for a retry', async () => {
    const wrapper = await mount()

    await wrapper.findAll('button').find(b => b.text() === 'Δοκιμή Ξανά')!.trigger('click')

    expect(wrapper.emitted('retry')).toHaveLength(1)
    expect(wrapper.emitted('dismiss')).toBeUndefined()
  })

  it('reports its dismissal', async () => {
    const wrapper = await mount()

    // Nuxt UI's alert close button (`close` slot hook).
    await wrapper.find('[data-slot="close"]').trigger('click')

    expect(wrapper.emitted('dismiss')).toHaveLength(1)
  })
})
