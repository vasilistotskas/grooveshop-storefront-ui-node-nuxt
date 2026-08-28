import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { NavLink } from '~/composables/useNavigation'
import PageNavbar from '~/components/Page/Navbar.vue'

const { navigationState } = vi.hoisted(() => ({
  navigationState: { header: null as NavLink[] | null },
}))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => navigationState.header),
  footerColumns: computed(() => null),
  mobileItems: computed(() => null),
}))

describe('PageNavbar', () => {
  beforeEach(() => {
    navigationState.header = null
  })

  it('renders operator-configured header items when present', async () => {
    navigationState.header = [
      { label: 'Blog', to: '/blog' },
      { label: 'Σχετικά', to: '/about' },
      { label: 'Επικοινωνία', to: '/contact' },
    ]

    const wrapper = await mountSuspended(PageNavbar)

    const hrefs = wrapper
      .findAll('nav ul:first-of-type a')
      .map(a => a.attributes('href'))
    expect(hrefs).toEqual(['/blog', '/about', '/contact'])
    // Configured menu replaces the platform trio entirely.
    expect(hrefs).not.toContain('/products')
    expect(wrapper.text()).toContain('Σχετικά')
  })

  it('falls back to the platform menu when no header menu is configured', async () => {
    const wrapper = await mountSuspended(PageNavbar)

    const hrefs = wrapper
      .findAll('nav ul:first-of-type a')
      .map(a => a.attributes('href'))
    expect(hrefs).toContain('/products')
    expect(hrefs).not.toContain('/about')
  })
})
