import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computed, effectScope, ref } from 'vue'
import type { EffectScope } from 'vue'
import { mockNuxtImport, registerEndpoint } from '@nuxt/test-utils/runtime'
import { createError } from 'h3'
import { makeTier } from '~~/test/fixtures/loyalty'

/**
 * What the account quick menus (the header dropdown and the phone sheet)
 * show: the shopper, their standing from the account summary, and the
 * account pages the navigation offers. The standing is the shopper's own
 * and moves: it is asked for on every open, a failed request is tried
 * again, and signing out drops it.
 */
const state = vi.hoisted(() => ({
  keys: [] as string[],
  user: undefined as any,
  response: { kind: 'ok' } as { kind: 'ok' | 'fail' },
  summary: {} as Record<string, unknown>,
  calls: 0,
}))

mockNuxtImport('useAccountNavigation', () => () => ({
  items: computed(() => state.keys.map(key => ({ key, label: `label:${key}`, icon: 'i-lucide-house', to: `/account/${key}`, active: false }))),
  onOverview: computed(() => false),
}))
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

const SILVER = makeTier({ id: 2 })
const summaryOf = (pointsBalance: number, businessStatus: string | null = null) => ({
  ordersCount: 3,
  loyalty: { pointsBalance, tier: SILVER },
  giftCardBalance: null,
  businessStatus,
})

let scope: EffectScope | undefined

function useMenu(keys = ['overview', 'orders', 'rewards', 'business']) {
  scope = effectScope()
  let result!: ReturnType<typeof useAccountQuickMenu>
  scope.run(() => useNuxtApp().runWithContext(() => {
    result = useAccountQuickMenu(keys as AccountNavKey[])
  }))
  return result
}

beforeEach(() => {
  state.keys = ['overview', 'orders', 'rewards', 'business']
  state.user ??= ref(null)
  state.user.value = { id: 7, email: 'maria@example.com', firstName: 'Μαρία', lastName: 'Κ', mainImagePath: '' }
  state.response = { kind: 'ok' }
  state.summary = summaryOf(100, 'APPROVED')
  state.calls = 0
  clearNuxtData('account-quick-menu-summary')
  registerEndpoint('/api/user/account/summary', () => {
    state.calls += 1
    if (state.response.kind === 'fail') throw createError({ statusCode: 500, statusMessage: 'down' })
    return state.summary
  })
})

afterEach(() => {
  scope?.stop()
})

describe('useAccountQuickMenu', () => {
  it('names the shopper, and offers the pages asked for that the navigation offers, in the order asked', () => {
    state.keys = ['overview', 'security', 'orders']

    const menu = useMenu(['orders', 'overview', 'rewards'])

    expect(menu.name.value).toBe('Μαρία Κ')
    expect(menu.email.value).toBe('maria@example.com')
    expect(menu.pages.value.map(page => page.key)).toEqual(['orders', 'overview'])
  })

  it('does not ask for the summary until a menu opens', () => {
    const menu = useMenu()

    expect(state.calls).toBe(0)
    expect(menu.pointsBalance.value).toBeNull()
  })

  it('reads the tier, points and business account off the summary once a menu opens', async () => {
    const menu = useMenu()

    menu.load()

    await vi.waitFor(() => expect(menu.pointsBalance.value).toBe(100))
    expect(menu.tierName.value).toBe(extractTranslated(SILVER, 'name', 'el'))
    expect(menu.isBusiness.value).toBe(true)
  })

  it('asks again on every open, so the points it shows are the current ones', async () => {
    const menu = useMenu()
    menu.load()
    await vi.waitFor(() => expect(menu.pointsBalance.value).toBe(100))

    state.summary = summaryOf(250)
    menu.load()

    await vi.waitFor(() => expect(menu.pointsBalance.value).toBe(250))
    expect(state.calls).toBe(2)
  })

  it('tries again after a failed request', async () => {
    state.response = { kind: 'fail' }
    const menu = useMenu()
    menu.load()
    // ofetch retries a failed GET once before it gives up.
    await vi.waitFor(() => expect(state.calls).toBe(2))
    expect(menu.pointsBalance.value).toBeNull()

    state.response = { kind: 'ok' }
    menu.load()

    await vi.waitFor(() => expect(menu.pointsBalance.value).toBe(100))
    expect(state.calls).toBe(3)
  })

  it('shows nothing of the previous shopper once their standing is cleared, as signing out does', async () => {
    const first = useMenu()
    first.load()
    await vi.waitFor(() => expect(first.pointsBalance.value).toBe(100))
    scope?.stop()

    clearNuxtData('account-quick-menu-summary')
    state.user.value = { id: 8, email: 'nikos@example.com', firstName: 'Νίκος', lastName: 'Π', mainImagePath: '' }
    state.summary = summaryOf(5)
    const second = useMenu()

    expect(second.name.value).toBe('Νίκος Π')
    expect(second.pointsBalance.value).toBeNull()
    expect(second.isBusiness.value).toBe(false)
  })
})
