export const useUserNotificationStore = defineStore('userNotification', () => {
  const notifications = ref<Pagination<NotificationUser>>()

  const notificationIds = computed(() => {
    if (!notifications.value || !notifications.value.results) {
      return []
    }
    return notifications.value.results.map(notification => notification.notification)
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
      console.error('Failed to setup notifications:', err)
    }
  }

  return {
    notifications,
    notificationIds,
    setupNotifications,
  }
})
