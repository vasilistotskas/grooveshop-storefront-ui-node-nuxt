/**
 * How many of the shopper's notifications are unseen — the bell's dot
 * and the account navigation's count read this one key, so they always
 * agree.
 *
 * An aggregate over the whole history (the notification list is
 * paginated), so it has its own endpoint, refetched whenever the
 * notification store changes — reading or marking one updates both.
 * Client-only and lazy: neither reader needs it for the first paint.
 */
export function useUnseenNotificationsCount() {
  const { getUnseenCount } = useUserNotification()
  const { loggedIn } = useUserSession()
  const { notifications } = storeToRefs(useUserNotificationStore())

  const { data, status } = useAsyncData(
    'unseenNotificationsCount',
    () => getUnseenCount(),
    {
      immediate: loggedIn.value,
      watch: [notifications],
      server: false,
      lazy: true,
    },
  )

  const count = computed(() =>
    data.value && 'count' in data.value ? data.value.count : 0,
  )
  const pending = computed(() => status.value === 'pending')

  return { count, pending }
}
