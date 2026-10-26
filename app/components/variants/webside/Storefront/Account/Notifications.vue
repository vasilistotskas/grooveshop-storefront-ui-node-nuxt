<script lang="ts" setup>
const { t, locale } = useI18n()
const localePath = useLocalePath()
// Every account route rendered with the document title left at the
// store name, twice — 46 pages whose browser tab and history entry were
// indistinguishable. The `title` string was already here and simply
// never applied.
useHead({ title: () => t('title') })
const { presentationFor } = useNotificationPresentation()

const {
  filter, ordering, pageSize, status, error, orderingOptions, pagination, rows,
  hasUnseenInView, onFilterChange, onRowClick, onToggleSeen, isMarkingAllSeen, onMarkAllSeen,
} = await useAccountNotifications({
  toasts: {
    allSeen: () => ({ title: t('mark_all.success_title'), color: 'success', icon: 'i-heroicons-check-circle' }),
  },
  titles: {
    toggle: () => t('error.toggle_title'),
    markAll: () => t('mark_all.error_title'),
  },
})

const filterItems = computed(() => [
  { label: t('filters.all'), value: 'all' satisfies NotificationSeenFilter },
  { label: t('filters.unseen'), value: 'unseen' satisfies NotificationSeenFilter },
  { label: t('filters.seen'), value: 'seen' satisfies NotificationSeenFilter },
])
</script>

<template>
  <WebsideAccountAreaPageWrapper
    class="
      flex flex-col gap-4
      md:mt-1 md:gap-6 md:!p-0
    "
  >
    <div class="flex flex-wrap items-center justify-between gap-3">
      <WebsidePageTitle :text="t('title')" class="md:mt-0" />

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
        @update:model-value="(value: string | number) => onFilterChange(value as NotificationSeenFilter)"
      />

      <div class="flex flex-wrap items-center gap-2">
        <WebsideAccountAreaPaginationPageNumber
          v-if="pagination"
          :count="pagination.count"
          :page="pagination.page"
          :page-size="pagination.pageSize"
        />
        <WebsideOrdering
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

    <WebsideError
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
                flex flex-wrap items-center gap-2 text-xs text-neutral-700
                dark:text-neutral-200
              "
              >
                <NuxtTime
                  :datetime="row.createdAt"
                  :locale="locale"
                  relative
                  numeric="auto"
                />
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

    <LazyWebsideEmptyState
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
    </LazyWebsideEmptyState>
  </WebsideAccountAreaPageWrapper>
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
  badge:
    new: "New"
  card:
    open: "Open"
  actions:
    mark_seen: "Mark as read"
    mark_unseen: "Mark as unread"
  empty:
    title: "No notifications"
    description: "They will show up here as soon as something happens."
    unseen_title: "You are all caught up"
    unseen_description: "Nothing new — we will let you know as soon as there is."
    cta: "Back to home"
  error:
    toggle_title: "That did not work"
    toggle_description: "Try again in a moment."
</i18n>
