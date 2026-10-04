import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { clearNuxtData } from '#app'
import NotificationsBell from '~/components/User/NotificationsBell.vue'

const { mockNavigateTo, mockMarkAsSeen, mockMarkAllSeen, mockGetUnseenCount } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockMarkAsSeen: vi.fn(() => Promise.resolve()),
  mockMarkAllSeen: vi.fn(() => Promise.resolve()),
  mockGetUnseenCount: vi.fn(() => Promise.resolve({ count: 1 })),
}))
const session = vi.hoisted(() => ({ loggedIn: undefined as any }))

mockNuxtImport('navigateTo', () => mockNavigateTo)
mockNuxtImport('useUserNotification', () => () => ({
  getUnseenCount: mockGetUnseenCount,
  getNotifications: () => Promise.resolve(undefined),
  markAsSeen: mockMarkAsSeen,
  markAllSeen: mockMarkAllSeen,
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

function row(id: number, overrides: { link?: string | null, seen?: boolean, category?: string, title?: string } = {}) {
  return {
    id,
    seen: overrides.seen ?? false,
    createdAt: '2026-10-01T10:00:00Z',
    notification: {
      id: id + 100,
      link: overrides.link === undefined ? '/account/orders/42' : overrides.link,
      kind: 'INFO',
      category: overrides.category ?? 'ORDER',
      translations: {
        el: { title: overrides.title ?? `Τίτλος ${id}`, message: 'Μ' },
        en: { title: overrides.title ?? `Title ${id}`, message: 'M' },
      },
    },
  }
}

function seedNotifications(...rows: ReturnType<typeof row>[]) {
  useUserNotificationStore().notifications = {
    links: { next: null, previous: null },
    count: rows.length,
    totalPages: 1,
    pageSize: 10,
    pageTotalResults: rows.length,
    page: 1,
    results: rows,
  } as any
}

/** The bell, opened: its popover is teleported, so rows are read from the document. */
async function mountOpenBell() {
  const wrapper = await mountSuspended(NotificationsBell, { route: false })
  await flushPromises()
  await wrapper.get('button[aria-haspopup="dialog"]').trigger('click')
  await flushPromises()
  return wrapper
}

const rowButton = (id: number) => document.getElementById(String(id))!
const rowTitles = () => [...document.querySelectorAll('ul button')].map(button => button.querySelector('span.font-semibold')?.textContent)
const bodyButton = (label: string) =>
  [...document.querySelectorAll('button')].find(button => button.textContent?.trim() === label)

/** The unseen dot on the bell: UChip renders its dot (`data-slot="base"`) only while `show` is true. */
const unseenDot = (wrapper: Awaited<ReturnType<typeof mountOpenBell>>) => wrapper.find('span[data-slot="base"]')

describe('NotificationsBell', () => {
  beforeEach(async () => {
    if (session.loggedIn) session.loggedIn.value = true
    const store = useUserNotificationStore()
    // Seeded rows keep the bell from self-bootstrapping through the store.
    vi.spyOn(store, 'setupNotifications').mockResolvedValue(undefined as any)
    seedNotifications(row(5))
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
    await mountOpenBell()

    rowButton(5).click()
    await flushPromises()

    expect(mockMarkAsSeen).toHaveBeenCalledWith([5])
    expect(mockNavigateTo).toHaveBeenCalledWith('/account/orders/42')
  })

  it('opens the path under /en for a viewer browsing in English', async () => {
    const { $i18n } = useNuxtApp()
    $i18n.locale.value = 'en'
    try {
      await mountOpenBell()

      rowButton(5).click()
      await flushPromises()

      expect(mockNavigateTo).toHaveBeenCalledWith('/en/account/orders/42')
    }
    finally {
      $i18n.locale.value = 'el'
    }
  })

  it('marks a link-less notification seen and reloads the list without navigating', async () => {
    seedNotifications(row(5, { link: null }))
    await mountOpenBell()

    rowButton(5).click()
    await flushPromises()

    expect(mockMarkAsSeen).toHaveBeenCalledWith([5])
    expect(useUserNotificationStore().setupNotifications).toHaveBeenCalled()
    expect(mockNavigateTo).not.toHaveBeenCalled()
  })

  describe('the list', () => {
    it('shows each notification\'s title in the page language, with a dot only while it is unread', async () => {
      seedNotifications(row(5, { seen: false, title: 'Η παραγγελία στάλθηκε' }), row(6, { seen: true, title: 'Πίσω στο απόθεμα' }))
      await mountOpenBell()

      expect(rowTitles()).toEqual(['Η παραγγελία στάλθηκε', 'Πίσω στο απόθεμα'])
      expect(rowButton(5).textContent).toContain('Μη αναγνωσμένη')
      expect(rowButton(6).textContent).not.toContain('Μη αναγνωσμένη')
    })

    it('says so when there are no notifications', async () => {
      seedNotifications()
      await mountOpenBell()

      expect(document.body.textContent).toContain('Δεν έχεις ειδοποιήσεις')
      expect(document.querySelectorAll('ul button')).toHaveLength(0)
    })

    it('leads to the full list of notifications', async () => {
      await mountOpenBell()

      const link = [...document.querySelectorAll('a')].find(anchor => anchor.textContent?.trim() === 'Δες όλες τις ειδοποιήσεις')
      expect(link?.getAttribute('href')).toBe('/account/notifications')
    })
  })

  describe('mark all read', () => {
    it('marks everything read and reloads the list', async () => {
      await mountOpenBell()

      bodyButton('Όλες ως αναγνωσμένες')!.click()
      await flushPromises()

      expect(mockMarkAllSeen).toHaveBeenCalledTimes(1)
      expect(useUserNotificationStore().setupNotifications).toHaveBeenCalled()
    })

    it('is not offered when everything has been read', async () => {
      mockGetUnseenCount.mockResolvedValue({ count: 0 })
      await mountOpenBell()

      expect(bodyButton('Όλες ως αναγνωσμένες')).toBeUndefined()
    })
  })

  it('shows the unseen dot while the unseen count is positive', async () => {
    const wrapper = await mountOpenBell()

    expect(unseenDot(wrapper).exists()).toBe(true)
  })

  it('hides the unseen dot when everything has been seen', async () => {
    mockGetUnseenCount.mockResolvedValue({ count: 0 })

    const wrapper = await mountOpenBell()

    expect(unseenDot(wrapper).exists()).toBe(false)
  })

  // Call counts are not asserted: the auth plugins react to the session
  // flag this spec flips and ask the same (mocked) composable.
  it('shows no unseen dot to a signed-out visitor', async () => {
    session.loggedIn.value = false

    const wrapper = await mountOpenBell()

    expect(unseenDot(wrapper).exists()).toBe(false)
  })
})
