<script lang="ts" setup>
const { t } = useI18n()
const localePath = useLocalePath()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })

const {
  unseenCount, filter, ordering, pageSize, status, error, refresh, orderingOptions, pagination, rows,
  hasUnseenInView, onFilterChange, onRowClick, onToggleSeen, isMarkingAllSeen, onMarkAllSeen,
} = await useAccountNotifications({
  toasts: {
    allSeen: () => ({ title: t('mark_all.success_title'), color: 'success', icon: 'i-lucide-circle-check' }),
  },
  titles: {
    toggle: () => t('error.toggle_title'),
    markAll: () => t('mark_all.error_title'),
  },
})

const filterItems = computed(() => [
  { label: t('filters.all'), value: 'all' satisfies NotificationSeenFilter },
  {
    label: t('filters.unseen'),
    value: 'unseen' satisfies NotificationSeenFilter,
    ...(unseenCount.value > 0 ? { badge: unseenCount.value } : {}),
  },
  { label: t('filters.seen'), value: 'seen' satisfies NotificationSeenFilter },
])
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
        @update:model-value="(value: string | number) => onFilterChange(value as NotificationSeenFilter)"
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
  empty:
    title: "Καμία ειδοποίηση"
    description: "Θα εμφανιστούν εδώ μόλις κάτι νέο συμβεί."
    unseen_title: "Τα έχεις διαβάσει όλα"
    unseen_description: "Καμία νέα ειδοποίηση — θα σε ειδοποιήσουμε μόλις υπάρξει νέα."
    cta: "Επιστροφή στην αρχική"
  load_error: "Δεν μπορέσαμε να φορτώσουμε τις ειδοποιήσεις σου."
  error:
    toggle_title: "Αποτυχία ενέργειας"
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
  empty:
    title: "No notifications"
    description: "They will show up here as soon as something happens."
    unseen_title: "You are all caught up"
    unseen_description: "Nothing new — we will let you know as soon as there is."
    cta: "Back to home"
  load_error: "We could not load your notifications."
  error:
    toggle_title: "That did not work"
</i18n>
