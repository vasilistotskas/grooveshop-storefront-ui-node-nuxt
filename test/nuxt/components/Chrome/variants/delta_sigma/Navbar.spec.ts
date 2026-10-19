import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import DeltaSigmaNavbar from '~/components/Chrome/variants/delta_sigma/Navbar.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * Δelta Σigma's phone menu lists `useNavigation().mobileLinks` (the Mobile
 * menu an admin saves under Content > Menus, else the Header menu: that
 * composable's spec), while the bar keeps the Header menu.
 */
const state = vi.hoisted(() => ({
  header: null as { label: string, to?: string }[] | null,
  phoneLinks: null as { label: string, to?: string }[] | null,
}))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => state.header),
  footerColumns: computed(() => null),
  mobileLinks: computed(() => state.phoneLinks),
}))
mockNuxtImport('useUserSession', () => () => ({
  loggedIn: ref(false),
  user: ref(null),
  session: ref({}),
  ready: ref(true),
  fetch: () => Promise.resolve(),
  clear: () => Promise.resolve(),
}))

beforeEach(() => {
  state.header = [{ label: 'Υπηρεσίες', to: '/services' }]
  state.phoneLinks = [{ label: 'Για κινητά', to: '/mobile-only' }]
  setTenant({ availableLocales: ['el'] })
})

describe('Chrome/variants/delta_sigma/Navbar', () => {
  it('lists the phone links in the phone menu, not the Header menu', async () => {
    const wrapper = await mountSuspended(DeltaSigmaNavbar, { route: false, attachTo: document.body })
    await wrapper.find('button[aria-expanded]').trigger('click')

    const hrefs = wrapper.find('div.border-t nav').findAll('a').map(link => link.attributes('href'))

    expect(hrefs).toContain('/mobile-only')
    expect(hrefs).not.toContain('/services')
  })
})
