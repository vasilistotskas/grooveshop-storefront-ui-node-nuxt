import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computed, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import MobileBottomNav from '~/components/MobileBottomNav.vue'

/**
 * The phone dock. Its entries are `useBottomNavItems` (own spec); here,
 * how it draws them: the active tab carries its label on screen, every
 * other tab is an icon whose label is still its accessible name. A
 * signed-in shopper's Account tab opens the account sheet, which is not
 * loaded until it is asked for.
 */
const { items, nav, session } = vi.hoisted(() => ({
  items: [
    { label: 'Αρχική', icon: 'i-heroicons-home', to: '/', active: true },
    { label: 'Αναζήτηση', icon: 'i-heroicons-magnifying-glass', to: '/search', active: false },
  ],
  nav: { onAccount: undefined as (() => void) | undefined },
  session: { loggedIn: undefined as any },
}))

mockNuxtImport('useBottomNavItems', () => (options: { onAccount?: () => void } = {}) => {
  nav.onAccount = options.onAccount
  return { items: computed(() => items) }
})
mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  return {
    loggedIn: session.loggedIn,
    user: ref(null),
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

// The sheet loads lazily; the module is replaced, and shows whether it was asked to be open.
vi.mock('~/components/Chrome/AccountSheet.vue', () => ({
  default: {
    props: { open: Boolean },
    template: '<div data-test="account-sheet" :data-open="open" />',
  },
}))

// Rendered on every width in the test environment.
const stubs = { MobileOrTabletOnly: { template: '<div><slot /></div>' } }

const mountNav = () => mountSuspended(MobileBottomNav, { route: false, global: { stubs } })

describe('MobileBottomNav', () => {
  beforeEach(() => {
    if (session.loggedIn) session.loggedIn.value = false
  })

  it('shows the active tab\'s label and keeps the others for screen readers only', async () => {
    const wrapper = await mountNav()

    const label = (text: string) => wrapper.findAll('[data-slot="linkLabel"]').find(node => node.text() === text)!

    expect(label('Αρχική').classes()).not.toContain('sr-only')
    expect(label('Αναζήτηση').classes()).toContain('sr-only')
  })

  it('names the navigation', async () => {
    const wrapper = await mountNav()

    expect(wrapper.find('nav').attributes('aria-label')).toBeTruthy()
  })

  describe('the account sheet', () => {
    it('is not loaded until the Account tab asks for it', async () => {
      session.loggedIn.value = true

      const wrapper = await mountNav()
      await flushPromises()

      expect(wrapper.find('[data-test="account-sheet"]').exists()).toBe(false)
    })

    it('opens when the Account tab is chosen', async () => {
      session.loggedIn.value = true
      const wrapper = await mountNav()

      nav.onAccount!()
      await flushPromises()

      expect(wrapper.get('[data-test="account-sheet"]').attributes('data-open')).toBe('true')
    })

    it('is never offered to a signed-out visitor', async () => {
      const wrapper = await mountNav()

      nav.onAccount!()
      await flushPromises()

      expect(wrapper.find('[data-test="account-sheet"]').exists()).toBe(false)
    })
  })
})
