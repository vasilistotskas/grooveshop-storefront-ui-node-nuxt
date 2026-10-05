<script lang="ts" setup>
/**
 * The header's notification bell: a dot while something is unread, and a
 * popover with the latest notifications, a "Mark all read" and a way to
 * the full list.
 *
 * Opening a notification marks it read and goes to its link; one without
 * a link is only marked read.
 */
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { markAsSeen, markAllSeen } = useUserNotification()
const userNotificationStore = useUserNotificationStore()
const { notifications } = storeToRefs(userNotificationStore)
const { setupNotifications } = userNotificationStore
const { loggedIn } = useUserSession()

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

const open = ref(false)

const POPOVER_UI = { content: 'w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-[1.25rem] p-0' }

const { count: unseenCount, pending } = useUnseenNotificationsCount()

const show = computed(() => unseenCount.value > 0)

// The store's detail-serialised rows, not Notification objects fetched by
// id: ``markAsSeen`` takes ``NotificationUser`` ids, which these rows
// carry beside the nested Notification content to render.
const userNotifications = computed(() => notifications.value?.results ?? [])

// ``link`` is a locale-neutral storefront path (``/account/orders/42``):
// the API stores no host and no locale prefix, so the viewer's current
// locale is applied here.
const onNotificationClick = async (
  notificationUserId: number,
  link?: string | null,
) => {
  open.value = false
  if (link) {
    markAsSeen([notificationUserId]).catch(() => {})
    setupNotifications().catch(() => {})
    await navigateTo(localePath(link))
    return
  }
  await markAsSeen([notificationUserId])
  await setupNotifications()
}

const onMarkAllRead = async () => {
  await markAllSeen()
  await setupNotifications()
}
</script>

<template>
  <!-- The unread dot is the accent, ringed in the header's ground so it
       reads as cut out of the bell. -->
  <UChip
    size="lg"
    color="secondary"
    :show="show"
    inset
    :ui="{ base: 'top-2.5 right-2.5 ring-2 ring-(--ui-bg-muted)' }"
  >
    <UPopover
      v-model:open="open"
      :content="{ align: 'end', sideOffset: 8 }"
      :ui="POPOVER_UI"
    >
      <UButton
        color="neutral"
        type="button"
        variant="ghost"
        square
        icon="i-lucide-bell"
        :aria-label="t('title')"
        :title="t('title')"
      />

      <template #content>
        <div class="flex flex-col">
          <div class="flex items-center justify-between gap-3 border-b border-default px-4 py-3">
            <h2 class="font-semibold text-highlighted">
              {{ t('title') }}
            </h2>
            <UButton
              v-if="show"
              :label="t('mark_all_read')"
              color="neutral"
              variant="ghost"
              size="sm"
              @click="onMarkAllRead"
            />
          </div>

          <ul
            v-if="!pending && userNotifications.length"
            class="max-h-[min(60vh,26rem)] overflow-y-auto overscroll-contain"
          >
            <li
              v-for="row in userNotifications"
              :key="row.id"
              class="border-b border-default last:border-b-0"
            >
              <button
                :id="String(row.id)"
                type="button"
                class="
                flex w-full cursor-pointer items-center gap-3 px-4 py-3
                text-left transition-colors
                hover:bg-elevated
              "
                :class="row.seen ? '' : 'bg-(--ui-secondary-soft)'"
                @click="onNotificationClick(row.id, row.notification?.link)"
              >
                <span
                  class="
                  flex size-10 shrink-0 items-center justify-center rounded-xl
                  bg-elevated text-highlighted
                "
                >
                  <UIcon
                    :name="notificationCategoryIcon(row.notification?.category)"
                    class="size-5"
                    aria-hidden="true"
                  />
                </span>
                <span class="grid min-w-0 flex-1 gap-0.5">
                  <span class="truncate text-sm font-semibold text-highlighted">
                    {{ extractTranslated(row.notification, 'title', locale) }}
                  </span>
                  <NuxtTime
                    :datetime="row.createdAt"
                    :locale="locale"
                    relative
                    numeric="auto"
                    class="text-xs text-toned"
                  />
                </span>
                <span
                  v-if="!row.seen"
                  class="size-2 shrink-0 rounded-full bg-secondary"
                >
                  <span class="sr-only">{{ t('unread') }}</span>
                </span>
              </button>
            </li>
          </ul>

          <div
            v-else-if="!pending"
            class="grid justify-items-center gap-2 px-4 py-8"
          >
            <UIcon
              name="i-lucide-bell-off"
              class="size-8 text-muted"
            />
            <p class="text-center text-sm text-toned">
              {{ t('no_notifications') }}
            </p>
          </div>

          <NuxtLink
            :to="localePath('account-notifications')"
            class="
            block border-t border-default px-4 py-3 text-center text-sm
            font-medium text-accent
            hover:bg-elevated
          "
            @click="() => { open = false }"
          >
            {{ t('view_all') }}
          </NuxtLink>
        </div>
      </template>
    </UPopover>
  </UChip>
</template>

<i18n lang="yaml">
el:
  title: Ειδοποιήσεις
  mark_all_read: Όλες ως αναγνωσμένες
  unread: Μη αναγνωσμένη
  no_notifications: Δεν έχεις ειδοποιήσεις
  view_all: Δες όλες τις ειδοποιήσεις
en:
  title: Notifications
  mark_all_read: Mark all read
  unread: Unread
  no_notifications: You have no notifications
  view_all: See all notifications
</i18n>
