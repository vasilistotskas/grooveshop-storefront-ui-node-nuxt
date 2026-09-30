import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import NotificationsBell from '~/components/User/NotificationsBell.vue'

const { mockNavigateTo, mockMarkAsSeen, mockGetUnseenCount } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockMarkAsSeen: vi.fn(() => Promise.resolve()),
  mockGetUnseenCount: vi.fn(() => Promise.resolve({ count: 1 })),
}))
const session = vi.hoisted(() => ({ loggedIn: undefined as any }))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserNotification', () => () => ({
  getUnseenCount: mockGetUnseenCount,
  getNotifications: () => Promise.resolve(undefined),
  markAsSeen: mockMarkAsSeen,
}))
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

function seedNotification(link: string | null) {
  useUserNotificationStore().notifications = {
    links: { next: null, previous: null },
    count: 1,
    totalPages: 1,
    pageSize: 10,
    pageTotalResults: 1,
    page: 1,
    results: [
      {
        id: 5,
        seen: false,
        notification: {
          id: 9,
          link,
          kind: 'INFO',
          category: 'ORDER',
          translations: { el: { title: 'Τ', message: 'Μ' }, en: { title: 'T', message: 'M' } },
        },
      },
    ],
  } as any
}

async function mountBell() {
  const wrapper = await mountSuspended(NotificationsBell, { route: false })
  await flushPromises()
  return wrapper
}

/** The unseen dot: UChip renders its dot (`data-slot="base"`) only while `show` is true. */
const unseenDot = (wrapper: Awaited<ReturnType<typeof mountBell>>) => wrapper.find('span[data-slot="base"]')

describe('NotificationsBell', () => {
  beforeEach(async () => {
    session.loggedIn && (session.loggedIn.value = true)
    const store = useUserNotificationStore()
    // Seeded rows keep the bell from self-bootstrapping through the store.
    vi.spyOn(store, 'setupNotifications').mockResolvedValue(undefined as any)
    seedNotification('/account/orders/42')
    // The previous test's bell is still mounted and re-fetches the count
    // when the rows change; let it settle, THEN drop the cached count.
    await flushPromises()
    clearNuxtData('unseenNotificationsCount')
  })

  /**
   * A notification's `link` is a locale-neutral storefront path
   * (`/account/orders/42`): the API stores no host and no locale prefix,
   * so a click opens it in the locale the viewer is browsing.
   */
  it('opens the path unprefixed in the default locale', async () => {
    const wrapper = await mountBell()

    await wrapper.find('[id="5"]').trigger('click')
    await flushPromises()

    expect(mockMarkAsSeen).toHaveBeenCalledWith([5])
    expect(mockNavigateTo).toHaveBeenCalledWith('/account/orders/42')
  })

  it('opens the path under /en for a viewer browsing in English', async () => {
    const { $i18n } = useNuxtApp()
    $i18n.locale.value = 'en'
    try {
      const wrapper = await mountBell()

      await wrapper.find('[id="5"]').trigger('click')
      await flushPromises()

      expect(mockNavigateTo).toHaveBeenCalledWith('/en/account/orders/42')
    }
    finally {
      $i18n.locale.value = 'el'
    }
  })

  it('marks a link-less notification seen and reloads the list without navigating', async () => {
    seedNotification(null)
    const wrapper = await mountBell()

    await wrapper.find('[id="5"]').trigger('click')
    await flushPromises()

    expect(mockMarkAsSeen).toHaveBeenCalledWith([5])
    expect(useUserNotificationStore().setupNotifications).toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  it('shows the unseen dot while the unseen count is positive', async () => {
    const wrapper = await mountBell()

    expect(unseenDot(wrapper).exists()).toBe(true)
  })

  it('hides the unseen dot when everything has been seen', async () => {
    mockGetUnseenCount.mockResolvedValue({ count: 0 })

    const wrapper = await mountBell()

    expect(unseenDot(wrapper).exists()).toBe(false)
  })

  // Call counts are not asserted: the auth plugins react to the session
  // flag this spec flips and ask the same (mocked) composable.
  it('shows no unseen dot to a signed-out visitor', async () => {
    session.loggedIn.value = false

    const wrapper = await mountBell()

    expect(unseenDot(wrapper).exists()).toBe(false)
  })
})
