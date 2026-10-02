import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import ChromeCheckoutHeader from '~/components/Chrome/CheckoutHeader.vue'

/**
 * The checkout's header leads only back to the cart, and says the page
 * is secure — in words a screen reader hears on a phone too, where the
 * lock stands alone on screen.
 */
const COPY = { backToCart: 'Επιστροφή στο καλάθι', secure: 'Ασφαλής ολοκλήρωση αγοράς' }

describe('Chrome/CheckoutHeader', () => {
  it('links back to the cart under its full name', async () => {
    const wrapper = await mountSuspended(ChromeCheckoutHeader, { route: false, global: { stubs: { TenantLogo: true } } })

    const back = wrapper.find('a[href="/cart"]')
    expect(back.exists()).toBe(true)
    expect(back.attributes('aria-label')).toBe(COPY.backToCart)
  })

  it('says the checkout is secure', async () => {
    const wrapper = await mountSuspended(ChromeCheckoutHeader, { route: false, global: { stubs: { TenantLogo: true } } })

    expect(wrapper.text()).toContain(COPY.secure)
  })
})
