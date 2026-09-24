import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import NotificationsBell from '~/components/User/NotificationsBell.vue'

/**
 * A notification's `link` is a locale-neutral storefront path
 * (`/account/orders/42`): the API stores no host and no locale prefix,
 * so a click opens it in the locale the viewer is browsing.
 */
const { mockNavigateTo, mockMarkAsSeen } = vi.hoisted(() => ({
  mockNavigateTo: vi.fn(),
  mockMarkAsSeen: vi.fn(() => Promise.resolve()),
}))

mockNuxtImport('navigateTo', () => mockNavigateTo)

mockNuxtImport('useUserNotification', () => () => ({
  getUnseenCount: () => Promise.resolve({ count: 1 }),
  getNotifications: () => Promise.resolve(undefined),
  markAsSeen: mockMarkAsSeen,
}))

function seedNotification(link: string) {
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

async function clickNotification() {
  const wrapper = await mountSuspended(NotificationsBell)
  await flushPromises()
  await wrapper.find('[id="5"]').trigger('click')
  await flushPromises()
}

describe('NotificationsBell', () => {
  beforeEach(() => {
    mockNavigateTo.mockReset()
    mockMarkAsSeen.mockClear()
  })

  it('opens the path unprefixed in the default locale', async () => {
    seedNotification('/account/orders/42')

    await clickNotification()

    expect(mockMarkAsSeen).toHaveBeenCalledWith([5])
    expect(mockNavigateTo).toHaveBeenCalledWith('/account/orders/42')
  })

  it('opens the path under /en for a viewer browsing in English', async () => {
    const { $i18n } = useNuxtApp()
    $i18n.locale.value = 'en'
    try {
      seedNotification('/account/orders/42')

      await clickNotification()

      expect(mockNavigateTo).toHaveBeenCalledWith('/en/account/orders/42')
    }
    finally {
      $i18n.locale.value = 'el'
    }
  })
})
