<script lang="ts" setup>
const { t, locale } = useI18n()
const localePath = useLocalePath()
const { getUnseenCount, markAsSeen } = useUserNotification()
const { presentationFor } = useNotificationPresentation()
const userNotificationStore = useUserNotificationStore()
const { notifications } = storeToRefs(userNotificationStore)
const { setupNotifications } = userNotificationStore
const { loggedIn } = useUserSession()

const isDropdownVisible = ref(false)
const dropdown = ref<HTMLDivElement>()
const toggleButton = ref<HTMLButtonElement>()

// Unseen count is an aggregate over the *whole* history (paginated
// list only covers page 1), so it has its own endpoint.
const { data: unseen, status: unseenStatus } = useAsyncData(
  'unseenNotificationsCount',
  () => getUnseenCount(),
  {
    immediate: loggedIn.value,
    watch: [notifications],
    server: false,
    lazy: true,
  },
)

const pending = computed(() => unseenStatus.value === 'pending')

const show = computed(() => {
  if (!unseen.value || !('count' in unseen.value)) return false
  return unseen.value.count > 0
})

// Drop directly into the store's detail-serialised rows instead of
// fetching Notification objects by ID (that path returned plain
// ``Notification`` rows keyed by Notification.id, which broke the
// ``markAsSeen`` call below — that endpoint expects
// ``NotificationUser`` ids). Using the store rows gives us both the
// nested Notification content to render AND the correct
// ``NotificationUser.id`` for mark-as-seen.
const userNotifications = computed(() => {
  return notifications.value?.results ?? []
})

type ResolvedLink = { to: string, external: boolean } | null

const resolveLink = (link?: string | null): ResolvedLink => {
  if (!link) return null
  if (link.startsWith('http://') || link.startsWith('https://')) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    if (origin && link.startsWith(origin)) {
      return { to: link.slice(origin.length) || '/', external: false }
    }
    return { to: link, external: true }
  }
  return { to: link, external: false }
}

const onNotificationClick = async (
  notificationUserId: number,
  link?: string | null,
) => {
  isDropdownVisible.value = false
  const resolved = resolveLink(link)
  if (resolved?.external) {
    markAsSeen([notificationUserId]).catch(() => {})
    setupNotifications().catch(() => {})
    window.open(resolved.to, '_blank', 'noopener,noreferrer')
    return
  }
  if (resolved) {
    markAsSeen([notificationUserId]).catch(() => {})
    setupNotifications().catch(() => {})
    await navigateTo(resolved.to)
    return
  }
  await markAsSeen([notificationUserId])
  await setupNotifications()
}

const toggleDropdown = () => {
  isDropdownVisible.value = !isDropdownVisible.value
}

onClickOutside(dropdown, () => {
  isDropdownVisible.value = false
}, {
  ignore: [toggleButton],
})
</script>

<template>
  <div
    ref="toggleButton"
    class="relative grid items-center"
  >
    <UChip
      :key="'notifications'"
      size="md"
      color="success"
      :show="show"
    >
      <UButton
        color="neutral"
        size="xl"
        type="button"
        variant="ghost"
        :aria-label="t('notifications.title')"
        :aria-expanded="isDropdownVisible"
        :title="t('notifications.title')"
        :ui="{
          base: `
            p-0
            hover:bg-transparent
          `,
        }"
        @click="toggleDropdown"
      >
        <Transition name="bell-fade" mode="out-in">
          <UIcon
            :key="isDropdownVisible ? 'solid' : 'outline'"
            :name="isDropdownVisible ? 'i-heroicons-solid:bell' : 'i-heroicons-bell'"
            class="size-6"
          />
        </Transition>
      </UButton>
    </UChip>
    <Transition>
      <div
        v-show="isDropdownVisible"
        ref="dropdown"
        class="
          absolute top-12 right-0 w-80 rounded-lg border border-gray-200
          bg-neutral-50 shadow-md
          md:top-14
          lg:-right-12
          dark:border-gray-800 dark:bg-neutral-900
        "
      >
        <div class="relative grid gap-1 p-2">
          <template v-if="!pending && userNotifications.length">
            <UButton
              v-for="row in userNotifications"
              :id="String(row.id)"
              :key="row.id"
              color="neutral"
              variant="link"
              class="justify-start"
              @click="onNotificationClick(row.id, row.notification?.link)"
            >
              <UCard
                variant="subtle"
                :ui="{
                  root: 'size-full',
                  body: `
                    p-2
                    sm:p-3
                  `,
                }"
              >
                <div class="flex items-start gap-3 text-left">
                  <UIcon
                    :name="presentationFor(row.notification?.kind, row.notification?.category).categoryIcon"
                    :class="['mt-0.5 size-5 shrink-0', presentationFor(row.notification?.kind, row.notification?.category).textClass]"
                  />
                  <div class="grid min-w-0 gap-0.5">
                    <span class="truncate text-sm font-medium">
                      {{ extractTranslated(row.notification, 'title', locale) }}
                    </span>
                    <span
                      class="
                        line-clamp-2 text-xs text-neutral-600
                        dark:text-neutral-300
                      "
                    >
                      {{ extractTranslated(row.notification, 'message', locale) }}
                    </span>
                  </div>
                </div>
              </UCard>
            </UButton>

            <UButton
              :to="localePath('account-notifications')"
              color="neutral"
              variant="soft"
              size="sm"
              icon="i-heroicons-arrow-right"
              trailing
              block
              class="mt-1"
              @click="isDropdownVisible = false"
            >
              {{ t('notifications.view_all') }}
            </UButton>
          </template>
          <template v-else-if="!pending && !userNotifications.length">
            <div
              class="
                grid items-center justify-center justify-items-center gap-2 p-2
              "
            >
              <UIcon
                name="i-heroicons-bell-alert"
                class="size-12"
              />
              <p class="text-center text-sm">
                {{ t('notifications.no_notifications') }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<i18n lang="yaml">
el:
  notifications:
    title: Ειδοποιήσεις
    no_notifications: Δεν έχεις ειδοποιήσεις
    view_all: "Δες όλες τις ειδοποιήσεις"
</i18n>

<style scoped>
.bell-fade-enter-active,
.bell-fade-leave-active {
  transition: opacity 150ms ease-out, transform 150ms ease-out;
}

.bell-fade-enter-from,
.bell-fade-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

@media (prefers-reduced-motion: reduce) {
  .bell-fade-enter-active,
  .bell-fade-leave-active {
    transition: none;
  }

  .bell-fade-enter-from,
  .bell-fade-leave-to {
    transform: none;
  }
}
</style>
