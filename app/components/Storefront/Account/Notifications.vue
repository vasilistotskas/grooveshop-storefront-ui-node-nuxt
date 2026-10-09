<script lang="ts" setup>
type SeenFilter = 'all' | 'unseen' | 'seen'

const { t, locale } = useI18n()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
const route = useRoute(`account-notifications___${locale.value}`)
const router = useRouter()
const { user } = useUserSession()
const localePath = useLocalePath()
const toast = useToast()
const { markAsSeen, markAsUnseen, markAllSeen } = useUserNotification()
const userNotificationStore = useUserNotificationStore()
const { setupNotifications } = userNotificationStore
const { count: unseenCount } = useUnseenNotificationsCount()

const pageSize = ref(10)
const page = computed(() => Number(route.query.page) || 1)
const ordering = computed(() => String(route.query.ordering || '-createdAt'))

const filter = computed<SeenFilter>(() => {
  const raw = route.query.filter
  return raw === 'unseen' || raw === 'seen' ? raw : 'all'
})

const seenQuery = computed<boolean | undefined>(() => {
  if (filter.value === 'unseen') return false
  if (filter.value === 'seen') return true
  return undefined
})

const filterItems = computed(() => [
  { label: t('filters.all'), value: 'all' satisfies SeenFilter },
  {
    label: t('filters.unseen'),
    value: 'unseen' satisfies SeenFilter,
    ...(unseenCount.value > 0 ? { badge: unseenCount.value } : {}),
  },
  { label: t('filters.seen'), value: 'seen' satisfies SeenFilter },
])

const entityOrdering = ref<EntityOrdering<any>>([
  {
    value: 'createdAt',
    label: t('ordering.created_at'),
    options: ['ascending', 'descending'],
  },
])

// ``useFetch`` tracks reactive query params when they're refs or
// computeds — passing a plain object (as ``buildQuery()`` would)
// snapshots values once at setup time and tab/page switches wouldn't
// re-fetch. Each field goes in as a computed so switching seen filter
// or page number refetches automatically without an explicit refresh().
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

async function onFilterChange(value: SeenFilter) {
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
  // A locale-neutral storefront path; open it in the viewer's locale.
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
    toast.add({
      title: t('error.toggle_title'),
      description: t('error.toggle_description'),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  }
}

const isMarkingAllSeen = ref(false)

async function onMarkAllSeen() {
  if (isMarkingAllSeen.value) return
  isMarkingAllSeen.value = true
  try {
    await markAllSeen()
    await Promise.all([refresh(), setupNotifications()])
    toast.add({
      title: t('mark_all.success_title'),
      color: 'success',
      icon: 'i-lucide-circle-check',
    })
  }
  catch (err) {
    log.error({ action: 'notifications:mark-all-seen', error: err })
    toast.add({
      title: t('mark_all.error_title'),
      description: t('mark_all.error_description'),
      color: 'error',
      icon: 'i-lucide-circle-x',
    })
  }
  finally {
    isMarkingAllSeen.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <AccountPageHeader :title="t('title')" />

    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <UTabs
        :model-value="filter"
        :items="filterItems"
        color="neutral"
        variant="link"
        :content="false"
        :ui="{ root: 'w-auto' }"
        @update:model-value="(value: string | number) => onFilterChange(value as SeenFilter)"
      />

      <UButton
        v-if="hasUnseenInView"
        color="neutral"
        variant="ghost"
        size="sm"
        icon="i-lucide-check"
        :loading="isMarkingAllSeen"
        :disabled="isMarkingAllSeen"
        @click="onMarkAllSeen"
      >
        {{ t('mark_all.cta') }}
      </UButton>
    </div>

    <div
      v-if="status === 'pending'"
      class="grid gap-3"
    >
      <USkeleton
        v-for="i in pageSize"
        :key="i"
        class="h-20 w-full rounded-[1.25rem]"
      />
    </div>

    <AccountLoadError
      v-else-if="error"
      :message="t('load_error')"
      @retry="() => refresh()"
    />

    <template v-else-if="rows.length">
      <ol class="grid gap-3">
        <li
          v-for="row in rows"
          :key="row.id"
        >
          <AccountNotificationsItem
            :row="row"
            @open="() => onRowClick(row)"
            @toggle="() => onToggleSeen(row)"
          />
        </li>
      </ol>

      <div class="flex flex-wrap items-center justify-between gap-2">
        <PaginationPageNumber
          v-if="pagination"
          :count="pagination.count"
          :page="pagination.page"
          :page-size="pagination.pageSize"
        />
        <Ordering
          :ordering="ordering"
          :ordering-options="orderingOptions.orderingOptionsArray.value"
        />
      </div>
    </template>

    <LazyEmptyState
      v-else
      class="w-full"
      :title="filter === 'unseen' ? t('empty.unseen_title') : t('empty.title')"
      :description="filter === 'unseen' ? t('empty.unseen_description') : t('empty.description')"
    >
      <template #icon>
        <UIcon
          name="i-lucide-bell"
          size="xl"
        />
      </template>
      <template #actions>
        <UButton
          :to="localePath('index')"
          color="neutral"
          variant="outline"
          size="sm"
        >
          {{ t('empty.cta') }}
        </UButton>
      </template>
    </LazyEmptyState>
  </div>
</template>

<i18n lang="yaml">
el:
  title: "Ειδοποιήσεις"
  filters:
    all: "Όλες"
    unseen: "Μη αναγνωσμένες"
    seen: "Αναγνωσμένες"
  ordering:
    created_at: "Ημερομηνία"
  mark_all:
    cta: "Σήμανση όλων ως αναγνωσμένες"
    success_title: "Όλες οι ειδοποιήσεις σημειώθηκαν ως αναγνωσμένες"
    error_title: "Αποτυχία"
    error_description: "Δοκίμασε ξανά σε λίγο."
  empty:
    title: "Καμία ειδοποίηση"
    description: "Θα εμφανιστούν εδώ μόλις κάτι νέο συμβεί."
    unseen_title: "Τα έχεις διαβάσει όλα"
    unseen_description: "Καμία νέα ειδοποίηση — θα σε ειδοποιήσουμε μόλις υπάρξει νέα."
    cta: "Επιστροφή στην αρχική"
  load_error: "Δεν μπορέσαμε να φορτώσουμε τις ειδοποιήσεις σου."
  error:
    toggle_title: "Αποτυχία ενέργειας"
    toggle_description: "Δοκίμασε ξανά σε λίγο."
en:
  title: "Notifications"
  filters:
    all: "All"
    unseen: "Unread"
    seen: "Read"
  ordering:
    created_at: "Date"
  mark_all:
    cta: "Mark all as read"
    success_title: "All notifications marked as read"
    error_title: "That did not work"
    error_description: "Try again in a moment."
  empty:
    title: "No notifications"
    description: "They will show up here as soon as something happens."
    unseen_title: "You are all caught up"
    unseen_description: "Nothing new — we will let you know as soon as there is."
    cta: "Back to home"
  load_error: "We could not load your notifications."
  error:
    toggle_title: "That did not work"
    toggle_description: "Try again in a moment."
</i18n>
