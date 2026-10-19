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
// The page is idle at once, as it is a moment after a real page has loaded.
mockNuxtImport('onNuxtReady', () => (callback: () => void) => callback())
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

  // Mounting the content in the tap's own task was most of the ~400 ms a
  // tap on the menu cost on a phone-class CPU (webside's INP, 2026-10-19).
  it('mounts its content, hidden, once the page is idle, before it is opened', async () => {
    const wrapper = await mountSuspended(BurgerMenu, { route: false, attachTo: document.body })

    await vi.waitFor(() => expect(document.body.querySelector('a[href="/mobile-only"]')).not.toBeNull())
    const dialog = document.body.querySelector<HTMLElement>('[role="dialog"]')
    const trigger = wrapper.find('button[aria-label]')

    expect(trigger.attributes('aria-expanded')).toBe('false')
    expect(dialog?.style.display).toBe('none')

    await trigger.trigger('click')
    await vi.waitFor(() => expect(dialog?.style.display).toBe(''))
    wrapper.unmount()
  })
})
