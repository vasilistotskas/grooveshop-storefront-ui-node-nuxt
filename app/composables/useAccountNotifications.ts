export type NotificationSeenFilter = 'all' | 'unseen' | 'seen'

/**
 * The account's notification list: the page, the ordering and the seen
 * filter (`?page=&ordering=&filter=`), the rows they ask for, and what a
 * shopper does with them: open one (marks it seen, then follows its link),
 * toggle one, mark every one seen. Awaited in `<script setup>`.
 *
 * The query goes in as a computed, so switching the filter or the page
 * refetches by itself; a plain object would snapshot the values once.
 * A notification's `link` is a locale-neutral storefront path (Django
 * stores no host and no locale: `Notification.link`,
 * `validate_storefront_path`), opened in the shopper's locale.
 *
 * `toasts.allSeen` is the success toast of "mark all seen"; failures go
 * through `useApiError` under `titles`.
 */
export async function useAccountNotifications(options: {
  toasts: { allSeen: () => ToastInput }
  titles: { toggle: () => string, markAll: () => string }
}) {
  const { t } = useNuxtApp().$i18n
  const route = useRoute()
  const router = useRouter()
  const { user } = useUserSession()
  const localePath = useLocalePath()
  const toast = useToast()
  const { notify } = useApiError()
  const { markAsSeen, markAsUnseen, markAllSeen } = useUserNotification()
  const { setupNotifications } = useUserNotificationStore()
  const { count: unseenCount } = useUnseenNotificationsCount()

  const pageSize = ref(10)
  const page = computed(() => Number(route.query.page) || 1)
  const ordering = computed(() => String(route.query.ordering || '-createdAt'))

  const filter = computed<NotificationSeenFilter>(() => {
    const raw = route.query.filter
    return raw === 'unseen' || raw === 'seen' ? raw : 'all'
  })

  const seenQuery = computed<boolean | undefined>(() => {
    if (filter.value === 'unseen') return false
    if (filter.value === 'seen') return true
    return undefined
  })

  const entityOrdering = ref<EntityOrdering<any>>([
    {
      value: 'createdAt',
      label: t('ordering.created_at'),
      options: ['ascending', 'descending'],
    },
  ])

  const query = computed(() => ({
    page: page.value,
    ordering: ordering.value,
    pageSize: pageSize.value,
    ...(seenQuery.value !== undefined ? { seen: seenQuery.value } : {}),
  }))

  const { data: notifications, status, error, refresh } = await useApi(
    `/api/user/account/${user.value?.id}/notifications`,
    {
      key: `userNotifications${user.value?.id}`,
      method: 'GET',
      headers: useRequestHeaders(),
      query,
    },
  )

  const orderingOptions = computed(() => useOrdering<any>(entityOrdering.value))

  const pagination = computed(() => {
    if (!notifications.value?.count) return
    return usePagination<NotificationUserDetail>(notifications.value)
  })

  const rows = computed(() => notifications.value?.results ?? [])

  const hasUnseenInView = computed(() =>
    rows.value.some(row => !row.seen),
  )

  async function onFilterChange(value: NotificationSeenFilter) {
    await router.replace({
      query: {
        ...route.query,
        filter: value === 'all' ? undefined : value,
        page: undefined,
      },
    })
  }

  const onRowClick = async (row: NotificationUserDetail) => {
    if (!row.seen) {
      await markAsSeen([row.id])
      await Promise.all([refresh(), setupNotifications()])
    }
    const link = row.notification?.link ?? ''
    if (!link) return
    await navigateTo(localePath(pathLocation(link)))
  }

  const onToggleSeen = async (row: NotificationUserDetail) => {
    try {
      if (row.seen) {
        await markAsUnseen([row.id])
      }
      else {
        await markAsSeen([row.id])
      }
      await Promise.all([refresh(), setupNotifications()])
    }
    catch (err) {
      log.error({ action: 'notifications:toggle-seen', error: err })
      notify('notifications:toggle-seen', err, { title: options.titles.toggle() })
    }
  }

  const isMarkingAllSeen = ref(false)

  async function onMarkAllSeen() {
    if (isMarkingAllSeen.value) return
    isMarkingAllSeen.value = true
    try {
      await markAllSeen()
      await Promise.all([refresh(), setupNotifications()])
      toast.add(options.toasts.allSeen())
    }
    catch (err) {
      log.error({ action: 'notifications:mark-all-seen', error: err })
      notify('notifications:mark-all-seen', err, { title: options.titles.markAll() })
    }
    finally {
      isMarkingAllSeen.value = false
    }
  }

  return {
    unseenCount,
    filter,
    page,
    ordering,
    pageSize,
    status,
    error,
    refresh,
    orderingOptions,
    pagination,
    rows,
    hasUnseenInView,
    onFilterChange,
    onRowClick,
    onToggleSeen,
    isMarkingAllSeen,
    onMarkAllSeen,
  }
}
