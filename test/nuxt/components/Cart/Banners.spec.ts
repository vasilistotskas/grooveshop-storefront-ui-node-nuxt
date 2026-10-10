import { describe, it, expect } from 'vitest'
import { mountSuspended, mockComponent } from '@nuxt/test-utils/runtime'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Banners from '~/components/Cart/Banners.vue'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * Above the cart's lines: free delivery reached (named for no carrier),
 * or the meter toward it, and one nudge per offer the cart is a few
 * euros short of.
 */
mockComponent('ShippingFreeShippingNotice', { template: '<div data-stub="meter" />' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Cart/Banners.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

/** Whitespace-free: `text()` joins sibling elements with no space at all. */
const words = (value: string) => value.replace(/\s+/g, '')
const euro = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

const mountBanners = (props: { cartTotal: number, threshold: number, nearMisses?: Cart['promotionNearMiss'] }) =>
  mountSuspended(Banners, { props: { nearMisses: [], ...props }, route: false })

describe('Cart/Banners', () => {
  it('says free delivery is unlocked once the cart reaches the threshold, with no meter', async () => {
    const wrapper = await mountBanners({ cartTotal: 50, threshold: 50 })

    expect(wrapper.text()).toContain(messages.unlocked_title)
    expect(words(wrapper.text())).toContain(words(messages.unlocked_description.replace('{threshold}', euro(50))))
    expect(wrapper.find('[data-stub="meter"]').exists()).toBe(false)
  })

  it('shows the meter, not the unlocked banner, while the cart is short of it', async () => {
    const wrapper = await mountBanners({ cartTotal: 49.99, threshold: 50 })

    expect(wrapper.find('[data-stub="meter"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain(messages.unlocked_title)
  })

  it('never claims free delivery when the store has no threshold', async () => {
    const wrapper = await mountBanners({ cartTotal: 500, threshold: 0 })

    expect(wrapper.text()).not.toContain(messages.unlocked_title)
  })

  it('nudges once per offer the cart is short of, with the amount and the offer', async () => {
    const wrapper = await mountBanners({
      cartTotal: 10,
      threshold: 0,
      nearMisses: [
        { promotionId: 1, name: 'POWER8', remainingAmount: 9.44, remainingQuantity: null },
        { promotionId: 2, name: 'AUDIO', remainingAmount: 3, remainingQuantity: null },
      ],
    })

    const text = words(wrapper.text())
    expect(text).toContain(words(messages.near_miss.replace('{amount}', euro(9.44)).replace('{name}', 'POWER8')))
    expect(text).toContain(words(messages.near_miss.replace('{amount}', euro(3)).replace('{name}', 'AUDIO')))
  })

  it('nudges by items when an offer is short of units, as a "2+1" with two in the cart', async () => {
    const [one, many] = messages.near_miss_quantity.split('|').map((form: string) => form.trim())
    const wrapper = await mountBanners({
      cartTotal: 20,
      threshold: 0,
      nearMisses: [
        { promotionId: 3, name: '2+1', remainingAmount: null, remainingQuantity: 1 },
        { promotionId: 4, name: '-5%', remainingAmount: null, remainingQuantity: 2 },
      ],
    })

    const text = words(wrapper.text())
    expect(text).toContain(words(one.replace('{count}', '1').replace('{name}', '2+1')))
    expect(text).toContain(words(many.replace('{count}', '2').replace('{name}', '-5%')))
    // A units teaser never reads as "add 0,00 €".
    expect(text).not.toContain(words(euro(0)))
  })
})
