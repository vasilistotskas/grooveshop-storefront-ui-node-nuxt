import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import PriorPrice from '~/components/Product/PriorPrice.vue'

describe('Product/PriorPrice', () => {
  it('strikes the price and names it as the lowest of the last 30 days', async () => {
    const wrapper = await mountSuspended(PriorPrice, {
      props: { price: 80 },
      attrs: { class: 'text-muted' },
      route: false,
    })

    expect(wrapper.get('s').text()).toBe(useNuxtApp().$i18n.n(80, 'currency'))
    expect(wrapper.get('s').classes()).toContain('text-muted')
    expect(wrapper.text()).toContain('Χαμηλότερη τιμή 30 ημερών')
  })
})
