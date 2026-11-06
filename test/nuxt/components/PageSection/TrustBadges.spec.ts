import { describe, it, expect } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { makeResolvedImage } from '~~/test/fixtures/media'
import TrustBadges from '~/components/PageSection/TrustBadges.vue'

const mountBadges = (items: unknown[]) => mountSuspended(TrustBadges, { route: false, props: { items } as Record<string, unknown> })

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
