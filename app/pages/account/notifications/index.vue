<script lang="ts" setup>
type SeenFilter = 'all' | 'unseen' | 'seen'

const { t, locale } = useI18n()
const route = useRoute(`account-notifications___${locale.value}`)
const router = useRouter()
const { user } = useUserSession()
const localePath = useLocalePath()
const toast = useToast()
const { markAsSeen, markAsUnseen, markAllSeen } = useUserNotification()
const { presentationFor } = useNotificationPresentation()
const userNotificationStore = useUserNotificationStore()
const { setupNotifications } = userNotificationStore

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
  { label: t('filters.unseen'), value: 'unseen' satisfies SeenFilter },
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

const { data: notifications, status, error, refresh } = await useFetch(
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
  const link = row.notification?.link ?? ''
  if (!link) return
  if (link.startsWith('http://') || link.startsWith('https://')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    if (origin && link.startsWith(origin)) {
      await navigateTo(link.slice(origin.length) || '/')
      return
    }
    window.open(link, '_blank', 'noopener,noreferrer')
    return
  }
  await navigateTo(link)
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
      icon: 'i-heroicons-x-circle',
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
      icon: 'i-heroicons-check-circle',
    })
  }
  catch (err) {
    log.error({ action: 'notifications:mark-all-seen', error: err })
    toast.add({
      title: t('mark_all.error_title'),
      description: t('mark_all.error_description'),
      color: 'error',
      icon: 'i-heroicons-x-circle',
    })
  }
  finally {
    isMarkingAllSeen.value = false
  }
}

const formatRelative = (value?: string | null) => {
  if (!value) return ''
  try {
    return new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto' })
      .format(Math.round((new Date(value).getTime() - Date.now()) / 60000), 'minute')
  }
  catch {
    return new Date(value).toLocaleString(locale.value)
  }
}

defineRouteRules({
  robots: false,
})

definePageMeta({
  layout: 'user',
})
</script>

<template>
  <PageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-6 md:!p-0
    "
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <PageTitle :text="t('title')" class="md:mt-0" />

      <UButton
        v-if="hasUnseenInView"
        color="primary"
        variant="soft"
        size="sm"
        icon="i-heroicons-check-circle"
        :loading="isMarkingAllSeen"
        :disabled="isMarkingAllSeen"
        @click="onMarkAllSeen"
      >
        {{ t('mark_all.cta') }}
      </UButton>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <UTabs
        :model-value="filter"
        :items="filterItems"
        color="primary"
        variant="pill"
        size="sm"
        :content="false"
        @update:model-value="(value: string | number) => onFilterChange(value as SeenFilter)"
      />

      <div class="flex flex-wrap items-center gap-2">
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
    </div>

    <div v-if="status === 'pending'" class="grid gap-2">
      <USkeleton
        v-for="i in pageSize"
        :key="i"
        class="h-24 w-full"
      />
    </div>

    <Error
      v-else-if="error"
      :error="error"
    />

    <ol v-else-if="rows.length" class="grid gap-3">
      <li v-for="row in rows" :key="row.id">
        <UCard
          :ui="{
            root: `
              transition-colors
              ${row.seen
                ? `
                  bg-neutral-50
                  dark:bg-neutral-900
                `
            : `
              bg-primary-50
              dark:bg-primary-900/30
            `}
            `,
            body: `
              p-3
              sm:p-4
            `,
          }"
        >
          <div class="flex items-start gap-3">
            <UIcon
              :name="presentationFor(row.notification?.kind, row.notification?.category).categoryIcon"
              :class="['mt-1 size-6 shrink-0', presentationFor(row.notification?.kind, row.notification?.category).textClass]"
            />

            <button
              type="button"
              class="grid min-w-0 flex-1 cursor-pointer gap-1 text-left"
              :aria-label="extractTranslated(row.notification, 'title', locale)"
              @click="onRowClick(row)"
            >
              <div class="flex items-center gap-2">
                <h3
                  class="
                  truncate text-sm font-semibold text-primary-950
                  dark:text-primary-50
                "
                >
                  {{ extractTranslated(row.notification, 'title', locale) }}
                </h3>
                <UBadge
                  v-if="!row.seen"
                  :label="t('badge.new')"
                  color="primary"
                  variant="soft"
                  size="xs"
                />
              </div>
              <p
                class="
                text-sm text-neutral-700
                dark:text-neutral-300
              "
              >
                {{ extractTranslated(row.notification, 'message', locale) }}
              </p>
              <div
                class="
                flex flex-wrap items-center gap-2 text-xs text-neutral-500
                dark:text-neutral-400
              "
              >
                <ClientOnly><span>{{ formatRelative(row.createdAt) }}</span></ClientOnly>
                <span v-if="row.notification?.link" class="inline-flex items-center gap-1">
                  <UIcon name="i-heroicons-arrow-top-right-on-square" class="size-3" />
                  <span>{{ t('card.open') }}</span>
                </span>
              </div>
            </button>

            <UTooltip :text="row.seen ? t('actions.mark_unseen') : t('actions.mark_seen')">
              <UButton
                :icon="row.seen ? 'i-heroicons-envelope' : 'i-heroicons-envelope-open'"
                color="neutral"
                variant="ghost"
                size="sm"
                :aria-label="row.seen ? t('actions.mark_unseen') : t('actions.mark_seen')"
                @click.stop="onToggleSeen(row)"
              />
            </UTooltip>
          </div>
        </UCard>
      </li>
    </ol>

    <LazyEmptyState
      v-else
      class="w-full"
      :title="filter === 'unseen' ? t('empty.unseen_title') : t('empty.title')"
      :description="filter === 'unseen' ? t('empty.unseen_description') : t('empty.description')"
    >
      <template #icon>
        <UIcon name="i-heroicons-bell" size="xl" />
      </template>
      <template #actions>
        <UButton
          :to="localePath('index')"
          color="primary"
          variant="soft"
          size="sm"
        >
          {{ t('empty.cta') }}
        </UButton>
      </template>
    </LazyEmptyState>
  </PageWrapper>
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
  badge:
    new: "Νέο"
  card:
    open: "Άνοιξε"
  actions:
    mark_seen: "Σήμανση ως αναγνωσμένο"
    mark_unseen: "Σήμανση ως μη αναγνωσμένο"
  empty:
    title: "Καμία ειδοποίηση"
    description: "Θα εμφανιστούν εδώ μόλις κάτι νέο συμβεί."
    unseen_title: "Τα έχεις διαβάσει όλα"
    unseen_description: "Καμία νέα ειδοποίηση — θα σε ειδοποιήσουμε μόλις υπάρξει νέα."
    cta: "Επιστροφή στην αρχική"
  error:
    toggle_title: "Αποτυχία ενέργειας"
    toggle_description: "Δοκίμασε ξανά σε λίγο."
</i18n>
