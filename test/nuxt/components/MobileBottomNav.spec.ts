import { describe, it, expect, vi } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import MobileBottomNav from '~/components/MobileBottomNav.vue'

/**
 * The phone dock. Its entries are `useBottomNavItems` (own spec); here,
 * how it draws them: the active tab carries its label on screen, every
 * other tab is an icon whose label is still its accessible name.
 */
const { items } = vi.hoisted(() => ({
  items: [
    { label: 'Αρχική', icon: 'i-heroicons-home', to: '/', active: true },
    { label: 'Αναζήτηση', icon: 'i-heroicons-magnifying-glass', to: '/search', active: false },
  ],
}))

mockNuxtImport('useBottomNavItems', () => () => ({ items: computed(() => items) }))

// Rendered on every width in the test environment.
const stubs = { MobileOrTabletOnly: { template: '<div><slot /></div>' } }

describe('MobileBottomNav', () => {
  it('shows the active tab\'s label and keeps the others for screen readers only', async () => {
    const wrapper = await mountSuspended(MobileBottomNav, { route: false, global: { stubs } })

    const label = (text: string) => wrapper.findAll('[data-slot="linkLabel"]').find(node => node.text() === text)!

    expect(label('Αρχική').classes()).not.toContain('sr-only')
    expect(label('Αναζήτηση').classes()).toContain('sr-only')
  })

  it('names the navigation', async () => {
    const wrapper = await mountSuspended(MobileBottomNav, { route: false, global: { stubs } })

    expect(wrapper.find('nav').attributes('aria-label')).toBeTruthy()
  })
})
