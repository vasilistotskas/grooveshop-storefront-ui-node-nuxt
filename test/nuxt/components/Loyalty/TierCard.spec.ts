import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TierCard from '~/components/Loyalty/TierCard.vue'
import { makeTier } from '~~/test/fixtures/loyalty'
import type { LoyaltyTier } from '~~/shared/openapi/types.gen'

/**
 * One tier of the public ladder: where it starts in lifetime points, its
 * name, its multiplier (only where the store runs them) and the perks the
 * merchant wrote in its description — one per line, never invented.
 */
const SILVER = makeTier({
  id: 2,
  requiredLevel: 5,
  pointsMultiplier: 1.25,
  translations: {
    el: { name: 'Ασημένιο', description: 'Δωρεάν αποστολή άνω των 30 €\nΠροτεραιότητα στην εξυπηρέτηση' },
    en: { name: 'Silver', description: 'Free shipping over 30 €' },
  },
})

const mountCard = (props: Partial<{ tier: LoyaltyTier, xpPerLevel: number, showMultiplier: boolean, featured: boolean }> = {}) =>
  mountSuspended(TierCard, {
    route: false,
    props: { tier: SILVER, xpPerLevel: 1000, showMultiplier: false, ...props },
  })

const n = (value: number) => useNuxtApp().$i18n.n(value)

describe('Loyalty/TierCard', () => {
  it('names the tier in the page language and says where it starts, in lifetime points', async () => {
    const wrapper = await mountCard()

    expect(wrapper.get('h3').text()).toBe('Ασημένιο')
    // Level 5 starts at (5 - 1) x 1000.
    expect(wrapper.text()).toContain(`${n(4000)} πόντοι`)
  })

  it('says "from 0" for the tier every account starts on', async () => {
    const wrapper = await mountCard({ tier: makeTier({ requiredLevel: 1 }) })

    expect(wrapper.text()).toContain('Από 0')
  })

  it('starts a tier where the store\'s own XP per level puts it', async () => {
    const wrapper = await mountCard({ xpPerLevel: 2500 })

    expect(wrapper.text()).toContain(`${n(10000)} πόντοι`)
  })

  it('shows the multiplier only where the store runs tier multipliers', async () => {
    const on = await mountCard({ showMultiplier: true })
    expect(on.text()).toContain(`×${n(1.25)} πόντοι`)

    const off = await mountCard({ showMultiplier: false })
    expect(off.text()).not.toContain('×')
  })

  it('lists the description a line at a time as perks', async () => {
    const wrapper = await mountCard()

    expect(wrapper.findAll('ul li').map(perk => perk.text())).toEqual([
      'Δωρεάν αποστολή άνω των 30 €',
      'Προτεραιότητα στην εξυπηρέτηση',
    ])
  })

  it('has no perks list for a tier without a description', async () => {
    const wrapper = await mountCard({
      tier: makeTier({ translations: { el: { name: 'Χάλκινο', description: '' }, en: { name: 'Bronze', description: '' } } }),
    })

    expect(wrapper.find('ul').exists()).toBe(false)
  })

  it('shows no name or perks rather than another language\'s', async () => {
    const wrapper = await mountCard({
      tier: makeTier({ translations: { en: { name: 'Silver', description: 'Free shipping' } } }),
    })

    // An empty heading is an accessibility error: it is left out.
    expect(wrapper.find('h3').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Free shipping')
  })

  it('draws the featured tier in ink, with its start in a volt chip', async () => {
    // The classes ARE the contract: the board draws the top tier on the
    // inverted surface, the one to aim for.
    const featured = await mountCard({ featured: true })
    const plain = await mountCard()

    expect(featured.classes()).toContain('bg-inverted')
    expect(featured.find('.bg-volt').exists()).toBe(true)
    expect(plain.classes()).not.toContain('bg-inverted')
  })
})
