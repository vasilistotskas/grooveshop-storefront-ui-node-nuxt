import { beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, ref } from 'vue'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import BurgerMenu from '~/components/variants/webside/Page/BurgerMenu.vue'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The frozen webside burger menu lists `useNavigation().mobileLinks` (the
 * Mobile menu an admin saves under Content > Menus, else the Header menu:
 * that composable's spec). Its markup is pinned by `frozen-render.spec.ts`.
 */
const state = vi.hoisted(() => ({
  phoneLinks: null as { label: string, to?: string }[] | null,
}))

mockNuxtImport('useNavigation', () => () => ({
  headerItems: computed(() => [{ label: 'Υπηρεσίες', to: '/services' }]),
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
  state.phoneLinks = [{ label: 'Για κινητά', to: '/mobile-only' }]
  setTenant({ availableLocales: ['el'] })
})

describe('webside Page/BurgerMenu', () => {
  it('lists the phone links, not the Header menu', async () => {
    const wrapper = await mountSuspended(BurgerMenu, { route: false, attachTo: document.body })
    await wrapper.find('button[aria-label]').trigger('click')
    await vi.waitFor(() => expect(document.body.querySelector('[role="dialog"]')).not.toBeNull())

    const hrefs = [...document.body.querySelectorAll('[role="dialog"] a')].map(a => a.getAttribute('href'))
    wrapper.unmount()

    expect(hrefs).toContain('/mobile-only')
    expect(hrefs).not.toContain('/services')
  })
})
