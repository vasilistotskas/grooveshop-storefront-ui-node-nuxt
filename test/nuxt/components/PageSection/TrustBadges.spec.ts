import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import type { ResolvedImage } from '~~/shared/types/builderData'
import { makeResolvedImage } from '~~/test/fixtures/media'
import TrustBadges from '~/components/PageSection/TrustBadges.vue'

type Item = { kind: 'payment' | 'shipping' | 'ai' | 'custom', label: string, icon?: string, image?: ResolvedImage }

const mountBadges = (items: Item[]) => mountSuspended(TrustBadges, { route: false, props: { items } })

describe('PageSection/TrustBadges image', () => {
  it('draws the logo, named by the badge label', async () => {
    const wrapper = await mountBadges([{ kind: 'payment', label: 'Visa', image: makeResolvedImage('https://assets.example.test/visa.svg', 'ignored') }])

    expect(wrapper.get('img').attributes('alt')).toBe('Visa')
  })

  it('falls back to the icon when the logo is gone', async () => {
    const wrapper = await mountBadges([{ kind: 'payment', label: 'Visa', icon: 'i-lucide-credit-card', image: { status: 'missing' } }])

    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.text()).toContain('Visa')
  })
})
