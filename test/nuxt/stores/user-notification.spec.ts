import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { setActivePinia, createPinia } from 'pinia'
import { useUserNotificationStore } from '~/stores/user-notification'
import { makeNotificationUserDetail } from '~~/test/fixtures/user'

/**
 * Plain `{ value }` holders, not refs: the setup plugin watches
 * `loggedIn`, and a reactive one would start its own session, account,
 * cart and language chain against these mocks whenever a test signs in.
 */
const { session, getNotifications } = vi.hoisted(() => ({
  session: { loggedIn: { value: false }, user: { value: null as { id: number } | null } },
  getNotifications: vi.fn((_userId?: number | null) => Promise.resolve<unknown>(undefined)),
}))

mockNuxtImport('useUserSession', () => () => ({
  ...session,
  fetch: vi.fn(() => Promise.resolve()),
  clear: vi.fn(() => Promise.resolve()),
}))
mockNuxtImport('useUserNotification', () => () => ({ getNotifications }))

function page(notificationIds: number[]): Pagination<NotificationUserDetail> {
  return {
    count: notificationIds.length,
    links: { next: null, previous: null },
    results: notificationIds.map((id, index) =>
      makeNotificationUserDetail({ id: index + 1, notification: { id } })),
  }
}

function signIn(userId: number) {
  session.loggedIn.value = true
  session.user.value = { id: userId }
}

describe('useUserNotificationStore', () => {
  let store: ReturnType<typeof useUserNotificationStore>

  beforeEach(() => {
    setActivePinia(createPinia())
    store = useUserNotificationStore()
    session.loggedIn.value = false
    session.user.value = null
  })

  it('lists the ids of the notifications, not of the user rows', () => {
    expect(store.notificationIds).toEqual([])
    store.notifications = page([101, 102])
    expect(store.notificationIds).toEqual([101, 102])
  })

  it('does not fetch for a signed-out visitor', async () => {
    await store.setupNotifications()

    expect(getNotifications).not.toHaveBeenCalled()
    expect(store.notifications).toBeUndefined()
  })

  it('fetches the signed-in user\'s notifications and stores them', async () => {
    signIn(7)
    const notifications = page([101])
    getNotifications.mockResolvedValueOnce(notifications)

    await store.setupNotifications()

    expect(getNotifications).toHaveBeenCalledWith(7)
    expect(store.notifications).toEqual(notifications)
  })

  it('keeps the previous notifications when the fetch answers nothing', async () => {
    signIn(7)
    store.notifications = page([101])
    getNotifications.mockResolvedValueOnce(null)

    await store.setupNotifications()

    expect(store.notificationIds).toEqual([101])
  })

  it('swallows a failed fetch and keeps the previous notifications', async () => {
    signIn(7)
    store.notifications = page([101])
    getNotifications.mockRejectedValueOnce(new Error('network down'))

    await expect(store.setupNotifications()).resolves.toBeUndefined()
    expect(store.notificationIds).toEqual([101])
  })

  it('clearNotificationsState empties the store', () => {
    store.notifications = page([101])

    store.clearNotificationsState()

    expect(store.notifications).toBeUndefined()
    expect(store.notificationIds).toEqual([])
  })
})
