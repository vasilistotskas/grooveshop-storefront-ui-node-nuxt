import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import AccountMenu from '~/components/Chrome/AccountMenu.vue'
import { makeTier } from '~~/test/fixtures/loyalty'

/**
 * The header's account control. Signed out it is the sign-in button;
 * signed in, the avatar opens a menu with the shopper's name and email,
 * their standing (tier and points, business account) and the pages worth
 * one tap. The pages are the account navigation's own, so one the store
 * switched off is never offered, and the standing is asked for only when
 * the menu opens.
 */
const state = vi.hoisted(() => ({
  keys: [] as string[],
  loggedIn: undefined as any,
  summary: {} as Record<string, unknown>,
  summaryCalls: 0,
}))
const { signOut } = vi.hoisted(() => ({ signOut: vi.fn() }))

// The pages' real paths: a link to a path the router does not know warns.
const PATHS: Record<string, string> = {
  overview: '/account',
  orders: '/account/orders',
  favourites: '/account/favourites/products',
  notifications: '/account/notifications',
  rewards: '/account/loyalty',
  business: '/account/business',
  security: '/account/security',
}

mockNuxtImport('useAccountNavigation', () => () => ({
  items: computed(() => state.keys.map(key => ({
    key,
    label: `label:${key}`,
    icon: 'i-lucide-house',
    to: PATHS[key],
    active: false,
  }))),
  onOverview: computed(() => false),
}))
mockNuxtImport('useSignOut', () => () => ({ signOut, signingOut: ref(false) }))
mockNuxtImport('useUserSession', () => () => {
  state.loggedIn ??= ref(true)
  return {
    loggedIn: state.loggedIn,
    user: ref({ id: 7, email: 'demo@grooveshop.space', firstName: 'Δήμος', lastName: 'Δοκιμής', mainImagePath: '' }),
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})

const SILVER = makeTier({ id: 2 })

beforeEach(() => {
  state.keys = ['overview', 'orders', 'favourites', 'notifications', 'rewards', 'business', 'security']
  if (state.loggedIn) state.loggedIn.value = true
  state.summary = { ordersCount: 14, loyalty: { pointsBalance: 2340, tier: SILVER }, giftCardBalance: null, businessStatus: 'APPROVED' }
  state.summaryCalls = 0
  clearNuxtData('account-quick-menu-summary')
  registerEndpoint('/api/user/account/summary', () => {
    state.summaryCalls += 1
    return state.summary
  })
})

const mountMenu = async () => {
  const wrapper = await mountSuspended(AccountMenu, { route: false })
  await flushPromises()
  return wrapper
}

/** The menu opens as a teleported popup; the trigger is the avatar button. */
async function openMenu(wrapper: Awaited<ReturnType<typeof mountMenu>>) {
  await wrapper.get('button[aria-haspopup="menu"]').trigger('keydown', { key: 'Enter' })
  await flushPromises()
}

const menuItems = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')]
// The standing chips (UBadge roots), in order.
const badges = () => [...document.querySelectorAll('[role="menu"] [data-slot="base"]')]
const menuText = () => document.querySelector('[role="menu"]')?.textContent?.replace(/\s+/g, ' ') ?? ''

describe('Chrome/AccountMenu', () => {
  it('offers a signed-out visitor the sign-in button', async () => {
    state.loggedIn ??= ref(true)
    state.loggedIn.value = false

    const wrapper = await mountMenu()

    expect(wrapper.get('a').attributes('href')).toBe('/account/login')
    expect(wrapper.find('button[aria-haspopup="menu"]').exists()).toBe(false)
  })

  describe('the open menu', () => {
    it('names the shopper and gives their email', async () => {
      await openMenu(await mountMenu())

      expect(menuText()).toContain('Δήμος Δοκιμής')
      expect(menuText()).toContain('demo@grooveshop.space')
    })

    it('keeps the card of the shopper out of the actions, so a screen reader does not read it as a dimmed item', async () => {
      await openMenu(await mountMenu())

      const card = [...document.querySelectorAll('[role="menu"] *')].find(node => node.textContent?.trim().startsWith('Δήμος Δοκιμής') && node.children.length > 0)!
      expect(card.closest('[role="menuitem"]')).toBeNull()
      expect(menuItems().some(item => item.textContent?.includes('demo@grooveshop.space'))).toBe(false)
    })

    it('offers the account, orders, favourites, rewards and security, in that order', async () => {
      await openMenu(await mountMenu())

      expect(menuItems().map(item => item.textContent?.trim())).toEqual([
        'Λογαριασμός', 'label:orders', 'label:favourites', 'label:rewards', 'label:security', 'Αποσύνδεση',
      ])
      expect(menuItems().slice(0, 5).map(item => item.getAttribute('href'))).toEqual([
        '/account', '/account/orders', '/account/favourites/products', '/account/loyalty', '/account/security',
      ])
    })

    it('leaves out a page the account navigation does not offer', async () => {
      state.keys = ['overview', 'orders', 'security']

      await openMenu(await mountMenu())

      expect(menuItems().map(item => item.textContent?.trim())).toEqual([
        'Λογαριασμός', 'label:orders', 'label:security', 'Αποσύνδεση',
      ])
    })

    it('signs the shopper out', async () => {
      await openMenu(await mountMenu())

      menuItems().find(item => item.textContent?.trim() === 'Αποσύνδεση')!.click()
      await flushPromises()

      expect(signOut).toHaveBeenCalledTimes(1)
    })
  })

  describe('standing', () => {
    const { n } = { n: (value: number) => useNuxtApp().$i18n.n(value) }

    it('asks for the summary only when the menu opens', async () => {
      const wrapper = await mountMenu()
      expect(state.summaryCalls).toBe(0)

      await openMenu(wrapper)
      await vi.waitFor(() => expect(state.summaryCalls).toBe(1))
    })

    it('shows the tier and points, and a business account', async () => {
      await openMenu(await mountMenu())

      await vi.waitFor(() => expect(menuText()).toContain(`${extractTranslated(SILVER, 'name', 'el')} · ${n(2340)} πόντοι`))
      expect(menuText()).toContain('B2B')
    })

    it('shows no points where the navigation does not offer the programme', async () => {
      state.keys = ['overview', 'orders', 'business']
      await openMenu(await mountMenu())

      await vi.waitFor(() => expect(state.summaryCalls).toBe(1))
      await flushPromises()
      expect(menuText()).not.toContain('πόντοι')
      expect(menuText()).toContain('B2B')
    })

    it('shows no business badge for an account that is not approved, or where B2B is off', async () => {
      state.summary = { ordersCount: 0, loyalty: null, giftCardBalance: null, businessStatus: 'PENDING' }
      await openMenu(await mountMenu())

      await vi.waitFor(() => expect(state.summaryCalls).toBe(1))
      await flushPromises()
      expect(menuText()).not.toContain('B2B')
    })

    it('shows a first tier-less shopper their points alone', async () => {
      state.summary = { ordersCount: 0, loyalty: { pointsBalance: 120, tier: null }, giftCardBalance: null, businessStatus: null }
      await openMenu(await mountMenu())

      await vi.waitFor(() => expect(menuText()).toContain(`${n(120)} πόντοι`))
      expect(menuText()).not.toContain('·')
      // No business account: no second badge.
      expect(menuText()).not.toContain('B2B')
    })

    it('shows a business account on its own, with no points badge beside it', async () => {
      state.keys = ['overview', 'orders', 'business']
      state.summary = { ordersCount: 0, loyalty: { pointsBalance: 120, tier: null }, giftCardBalance: null, businessStatus: 'APPROVED' }
      await openMenu(await mountMenu())

      await vi.waitFor(() => expect(menuText()).toContain('B2B'))
      expect(badges().map(badge => badge.textContent?.trim())).toEqual(['B2B'])
    })

    it('does not call an account business where the navigation does not offer B2B', async () => {
      state.keys = ['overview', 'orders', 'rewards']
      await openMenu(await mountMenu())

      await vi.waitFor(() => expect(menuText()).toContain('πόντοι'))
      expect(menuText()).not.toContain('B2B')
    })
  })
})
