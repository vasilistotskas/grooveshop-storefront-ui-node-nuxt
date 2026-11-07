import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { ResolvedImage } from '~~/shared/types/builderData'
import { makeResolvedImage } from '~~/test/fixtures/media'
import TrustBadges from '~/components/PageSection/TrustBadges.vue'

type Item = { kind: 'payment' | 'shipping' | 'ai' | 'custom', label: string, icon?: string, image?: ResolvedImage }

const mountBadges = (items: Item[]) => mountSuspended(TrustBadges, { route: false, props: { items } })

describe('PageSection/TrustBadges image', () => {
  it('draws the logo, named by the badge label when the image says nothing', async () => {
    const wrapper = await mountBadges([{ kind: 'payment', label: 'Visa', image: makeResolvedImage('https://assets.example.test/visa.svg') }])

    expect(wrapper.get('img').attributes('alt')).toBe('Visa')
  })

  it.each([[false], [true]])('falls back to the icon when the logo is gone (scrolling row: %s)', async (marquee) => {
    const items: Item[] = [{ kind: 'payment', label: 'Visa', icon: 'i-lucide-credit-card', image: { status: 'missing' } }]
    const wrapper = await mountSuspended(TrustBadges, { route: false, props: { marquee, items } })

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'UIcon' }).props('name')).toBe('i-lucide-credit-card')
  })

  it.each([[false], [true]])('names a logo by what the image says, over the label (scrolling row: %s)', async (marquee) => {
    const image: ResolvedImage = makeResolvedImage('https://assets.example.test/visa.png', 'Λογότυπο Visa')
    const wrapper = await mountSuspended(TrustBadges, { route: false, props: { marquee, items: [{ kind: 'payment', label: 'Visa', image }] } })

    expect(wrapper.get('img').attributes('alt')).toBe('Λογότυπο Visa')
  })

  it('draws the logo on both paths', async () => {
    const items: Item[] = [{ kind: 'payment', label: 'Visa', image: makeResolvedImage('https://assets.example.test/visa.svg') }]
    const row = await mountSuspended(TrustBadges, { route: false, props: { items } })
    const marquee = await mountSuspended(TrustBadges, { route: false, props: { items, marquee: true } })

    expect(row.find('img').exists()).toBe(true)
    expect(marquee.find('img').exists()).toBe(true)
  })
})
