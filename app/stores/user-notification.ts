export const useUserNotificationStore = defineStore('userNotification', () => {
  // The user-account notifications endpoint returns ``NotificationUserDetail``
  // rows (nested ``notification`` object + ``UserDetails``) so the bell
  // and the dedicated page can render title/message without a second
  // fetch. The store doesn't care about the user subfield — only the
  // ``notification`` id, used to invalidate the bell's ``getNotifications``
  // ID-based lookup.
  const notifications = ref<Pagination<NotificationUserDetail>>()

  const notificationIds = computed(() => {
    if (!notifications.value || !notifications.value.results) {
      return []
    }
    return notifications.value.results.map(notification => notification.notification.id)
  })

  const setupNotifications = async () => {
    const { loggedIn, user } = useUserSession()
    if (!loggedIn.value) {
      return
    }

    try {
      const { getNotifications } = useUserNotification()
      const data = await getNotifications(user.value?.id)

      if (data) {
        notifications.value = data
      }
    }
    catch (err) {
      log.error({ action: 'notifications:setup', error: err })
    }
  }

  return {
    notifications,
    notificationIds,
    setupNotifications,
  }
})
