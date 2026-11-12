import { describe, it, expect, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import RestockAlert from '~/components/Product/RestockAlert.vue'

/**
 * The platform's "notify me when it's back": a link-styled button that opens
 * the alerts dialog on the restock alert, the dialog mounted on the first
 * open. Its classes go on the button, where the caller places it.
 */
vi.mock('~/components/Product/NotifyMe.vue', () => ({
  default: { props: ['open', 'kind', 'productId', 'soldOut', 'priceDrop'], template: '<div data-test="dialog" :data-open="String(open)" :data-kind="kind" :data-product="productId" />' },
}))

const mountAlert = () => mountSuspended(RestockAlert, {
  route: false,
  props: { productId: 7, productName: 'Φορτιστής', productImage: null },
  attrs: { class: 'self-start' },
})

describe('Product/RestockAlert', () => {
  it('opens the restock alert for the product, mounting the dialog on the first open', async () => {
    const wrapper = await mountAlert()
    expect(wrapper.find('[data-test="dialog"]').exists()).toBe(false)

    await wrapper.get('button').trigger('click')

    await vi.waitFor(() => expect(wrapper.find('[data-test="dialog"]').exists()).toBe(true))
    const dialog = wrapper.get('[data-test="dialog"]')
    expect([dialog.attributes('data-open'), dialog.attributes('data-kind'), dialog.attributes('data-product')]).toEqual(['true', 'restock', '7'])
  })

  // The classes are the contract: a phone's tap target is at least 44px
  // (WCAG 2.5.5); from `sm` up the link-styled button keeps its size. The
  // caller's classes land on the button too.
  it('is a 44px target on a phone, and takes the caller\'s placement', async () => {
    const wrapper = await mountAlert()

    expect(wrapper.get('button').classes()).toEqual(expect.arrayContaining(['min-h-11', 'sm:min-h-0', 'self-start']))
  })
})
