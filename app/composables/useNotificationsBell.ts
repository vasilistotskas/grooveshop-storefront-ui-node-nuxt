/**
 * The header bell's notifications: the store's latest rows
 * (`userNotifications`, the detail-serialised ones: `markAsSeen` takes the
 * `NotificationUser` ids they carry beside the nested notification), the
 * unseen count behind its dot (`show`, `pending`: one key shared with the
 * account navigation) and what a shopper does with them.
 *
 * Opening a notification (`close` shuts the bell) marks it seen and goes to
 * its link; one without a link is only marked seen. A link is a
 * locale-neutral storefront path (Django stores no host and no locale:
 * `Notification.link`, `validate_storefront_path`), opened in the shopper's
 * locale.
 */
export function useNotificationsBell(options: { close: () => void }) {
  const localePath = useLocalePath()
  const { markAsSeen, markAllSeen } = useUserNotification()
  const userNotificationStore = useUserNotificationStore()
  const { notifications } = storeToRefs(userNotificationStore)
  const { setupNotifications } = userNotificationStore
  const { loggedIn } = useUserSession()
  const { count: unseenCount, pending } = useUnseenNotificationsCount()

  // Defensive bootstrap — if the ``setup`` plugin's idle-callback couldn't
  // populate the store (one of its sibling calls rejected, idle callback
  // never fired, etc.) the bell would show "no notifications" even when
  // the unseen-count endpoint returns a positive number. Loading here as
  // a no-op when already populated keeps the bell self-consistent.
  onMounted(() => {
    if (!loggedIn.value) return
    if (notifications.value && notifications.value.results?.length) return
    setupNotifications().catch(err => log.warn({ tag: 'notifications:bell', message: 'self-bootstrap failed', error: err }))
  })

  const show = computed(() => unseenCount.value > 0)

  const userNotifications = computed(() => notifications.value?.results ?? [])

  const onNotificationClick = async (
    notificationUserId: number,
    link?: string | null,
  ) => {
    options.close()
    if (link) {
      markAsSeen([notificationUserId]).catch(() => {})
      setupNotifications().catch(() => {})
      await navigateTo(localePath(pathLocation(link)))
      return
    }
    await markAsSeen([notificationUserId])
    await setupNotifications()
  }

  const onMarkAllRead = async () => {
    await markAllSeen()
    await setupNotifications()
  }

  return { userNotifications, show, pending, onNotificationClick, onMarkAllRead }
}
