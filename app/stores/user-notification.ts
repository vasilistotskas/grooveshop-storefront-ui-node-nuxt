export const useUserNotificationStore = defineStore('userNotification', () => {
  const { loggedIn, user } = useUserSession()

  const notifications = ref<Pagination<NotificationUser>>()

  const notificationIds = computed(() => {
    if (!notifications.value || !notifications.value.results) {
      return []
    }
    return notifications.value.results.map(notification => notification.notification)
  })

  const setupNotifications = async () => {
    if (!loggedIn.value) {
      return
    }
    const { getNotifications } = useUserNotification()
    const { data } = await useAsyncData(
      'userNotifications',
      () => getNotifications(user.value?.id),
    )
    if (data.value) {
      notifications.value = data.value
    }
  }

  return {
    notifications,
    notificationIds,
    setupNotifications,
  }
})
