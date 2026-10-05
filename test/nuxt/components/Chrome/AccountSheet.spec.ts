import { describe, it, expect, beforeEach, vi } from 'vitest'
import { reactive, ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import AccountSheet from '~/components/Chrome/AccountSheet.vue'
import { makeTier } from '~~/test/fixtures/loyalty'

/**
 * The phone's account sheet: the shopper, their standing, the account's
 * quick pages (with the unread count on notifications) and signing out.
 * It asks for the summary when it opens, and closes on any navigation.
 */
const state = vi.hoisted(() => ({
  user: undefined as any,
  keys: [] as string[],
  summary: {} as Record<string, unknown>,
  summaryCalls: 0,
  route: { fullPath: '/' } as { fullPath: string },
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
    ...(key === 'notifications' ? { badge: 3 } : {}),
  }))),
  onOverview: computed(() => false),
}))
mockNuxtImport('useSignOut', () => () => ({ signOut, signingOut: ref(false) }))
mockNuxtImport('useUserSession', () => () => {
  state.user ??= ref(null)
  return {
    loggedIn: ref(true),
    user: state.user,
    session: ref({}),
    ready: ref(true),
    fetch: () => Promise.resolve(),
    clear: () => Promise.resolve(),
  }
})
mockNuxtImport('useRoute', () => () => state.route)

const SILVER = makeTier({ id: 2 })

beforeEach(() => {
  state.user ??= ref(null)
  state.user.value = { id: 7, email: 'demo@grooveshop.space', firstName: 'Δήμος', lastName: 'Δοκιμής', mainImagePath: '' }
  state.keys = ['overview', 'orders', 'notifications', 'favourites', 'rewards', 'business', 'security']
  state.summary = { ordersCount: 14, loyalty: { pointsBalance: 2340, tier: SILVER }, giftCardBalance: null, businessStatus: 'APPROVED' }
  state.summaryCalls = 0
  state.route = reactive({ fullPath: '/' })
  clearNuxtData('account-quick-menu-summary')
  registerEndpoint('/api/user/account/summary', () => {
    state.summaryCalls += 1
    return state.summary
  })
})

const mountSheet = async (open = true) => {
  const wrapper = await mountSuspended(AccountSheet, { route: false, props: { open } })
  await flushPromises()
  return wrapper
}

const sheetText = () => document.querySelector('[role="dialog"]')?.textContent?.replace(/\s+/g, ' ') ?? ''
const rows = () => [...document.querySelectorAll<HTMLElement>('[role="dialog"] li a, [role="dialog"] li button')]

describe('Chrome/AccountSheet', () => {
  it('names the shopper', async () => {
    await mountSheet()

    expect(sheetText()).toContain('Δήμος Δοκιμής')
  })

  it('offers the account, orders, notifications, favourites, rewards and security, then signing out', async () => {
    await mountSheet()

    expect(rows().map(row => row.textContent?.replace(/\s+/g, ' ').trim())).toEqual([
      'Λογαριασμός', 'label:orders', 'label:notifications3 μη αναγνωσμένες', 'label:favourites', 'label:rewards', 'label:security', 'Αποσύνδεση',
    ])
    expect(rows().slice(0, 6).map(row => row.getAttribute('href'))).toEqual([
      '/account', '/account/orders', '/account/notifications', '/account/favourites/products', '/account/loyalty', '/account/security',
    ])
  })

  it('leaves out a page the account navigation does not offer', async () => {
    state.keys = ['overview', 'orders']

    await mountSheet()

    expect(rows().map(row => row.textContent?.trim())).toEqual(['Λογαριασμός', 'label:orders', 'Αποσύνδεση'])
  })

  it('signs the shopper out', async () => {
    await mountSheet()

    rows().find(row => row.textContent?.trim() === 'Αποσύνδεση')!.click()
    await flushPromises()

    expect(signOut).toHaveBeenCalledTimes(1)
  })

  describe('standing', () => {
    const n = (value: number) => useNuxtApp().$i18n.n(value)

    it('asks for the summary when it opens, not before', async () => {
      const wrapper = await mountSheet(false)
      expect(state.summaryCalls).toBe(0)

      await wrapper.setProps({ open: true })

      await vi.waitFor(() => expect(state.summaryCalls).toBe(1))
    })

    it('says the tier, the points and a business account under the name', async () => {
      await mountSheet()

      await vi.waitFor(() => expect(sheetText()).toContain(`${extractTranslated(SILVER, 'name', 'el')} · ${n(2340)} πόντοι · B2B`))
    })

    it('says the email until the standing is known, and when there is none to say', async () => {
      state.summary = { ordersCount: 0, loyalty: null, giftCardBalance: null, businessStatus: null }

      await mountSheet()
      await vi.waitFor(() => expect(state.summaryCalls).toBe(1))
      await flushPromises()

      expect(sheetText()).toContain('demo@grooveshop.space')
      expect(sheetText()).not.toContain('B2B')
    })
  })

  it('always has a description, even for an account with no standing and no email', async () => {
    state.user.value = { id: 9, email: '', firstName: 'Δήμος', lastName: 'Δοκιμής', mainImagePath: '' }
    state.summary = { ordersCount: 0, loyalty: null, giftCardBalance: null, businessStatus: null }

    await mountSheet()
    await vi.waitFor(() => expect(state.summaryCalls).toBe(1))
    await flushPromises()

    const dialog = document.querySelector('[role="dialog"]')!
    expect(document.getElementById(dialog.getAttribute('aria-describedby') ?? '')?.textContent?.trim()).toBe('Μενού λογαριασμού')
  })

  it('closes on any navigation', async () => {
    const wrapper = await mountSheet()

    state.route.fullPath = '/account/orders'
    await flushPromises()

    expect(wrapper.emitted('update:open')).toEqual([[false]])
  })
})
