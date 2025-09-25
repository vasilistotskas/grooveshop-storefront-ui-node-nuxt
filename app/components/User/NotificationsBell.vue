<script lang="ts" setup>
const { t, locale } = useI18n()
const { getUnseenCount, markAsSeen } = useUserNotification()
const { getNotifications } = useNotification()
const userNotificationStore = useUserNotificationStore()
const { setupNotifications } = userNotificationStore

const {
  notificationIds,
  notifications,
} = storeToRefs(userNotificationStore)
const { loggedIn } = useUserSession()

const isDropdownVisible = ref(false)
const dropdown = ref<HTMLDivElement>()
const toggleButton = ref<HTMLButtonElement>()

const { data: unseen, execute: executeUnseenCount, status: unseenStatus } = await useAsyncData(
  'unseenNotificationsCount',
  () => getUnseenCount(),
  {
    immediate: false,
    watch: [notificationIds],
  },
)

const { data, execute, status: notificationsStatus } = await useLazyAsyncData(
  'notifications',
  () => getNotifications(notificationIds.value),
  {
    immediate: false,
    watch: [notificationIds],
  },
)

watchEffect(async () => {
  if (loggedIn.value && notificationIds.value && notificationIds.value.length) {
    await execute()
    await executeUnseenCount()
  }
})

const pending = computed(() => {
  return unseenStatus.value === 'pending' || notificationsStatus.value === 'pending'
})

const show = computed(() => {
  if (!unseen.value || !('count' in unseen.value)) {
    return false
  }
  return unseen.value.count > 0
})

const userNotifications = computed(() => {
  if (!notifications.value || !notifications.value?.results) {
    return []
  }
  if (!data.value) {
    return []
  }
  return notifications.value?.results?.map((notification) => {
    return {
      ...notification,
      notification: data.value?.find(n => (n as any).id === notification.notification),
    }
  })
})

const onNotificationClick = async (id: number) => {
  await markAsSeen([id])
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
        :icon="isDropdownVisible ? 'i-heroicons-solid:bell' : 'i-heroicons-bell'"
        color="neutral"
        size="xl"
        type="button"
        variant="ghost"
        :aria-label="t('notifications.title')"
        :title="t('notifications.title')"
        :ui="{
          base: 'p-0 hover:bg-transparent',
        }"
        @click="toggleDropdown"
      />
    </UChip>
    <Transition>
      <div
        v-if="isDropdownVisible"
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
          <template v-if="!pending && userNotifications?.length">
            <UButton
              v-for="(userNotification, index) in userNotifications"
              :id="userNotification.id"
              :key="index"
              color="neutral"
              variant="link"
              @click="onNotificationClick(userNotification.id)"
            >
              <UCard
                variant="subtle"
                :ui="{
                  root: 'w-full h-full',
                  body: 'p-2 sm:p-4',
                }"
              >
                <UChip
                  :id="`notification-${userNotification.id}`"
                  :key="`notification-${userNotification.id}`"
                  class="w-full"
                  size="md"
                  color="success"
                  :show="true"
                  :ui="{
                    root: 'grid gap-1',
                  }"
                >
                  <span
                    class="truncate text-sm"
                    v-html="extractTranslated(userNotification.notification, 'title', locale)"
                  />
                  <span
                    class="text-xs"
                    v-html="extractTranslated(userNotification.notification, 'message', locale)"
                  />
                </UChip>
              </UCard>
            </UButton>
          </template>
          <template v-else-if="!pending && !userNotifications?.length">
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
    no_notifications: Δεν έχετε ειδοποιήσεις
</i18n>
