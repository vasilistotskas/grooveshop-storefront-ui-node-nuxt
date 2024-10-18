<script lang="ts" setup>
const { locale } = useI18n()
const { getUnseenCount, markAsSeen } = useUserNotification()
const { getNotifications } = useNotification()
const userNotificationStore = useUserNotificationStore()
const { refreshNotifications } = userNotificationStore

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
  if (notificationIds.value && notificationIds.value.length) {
    await execute()
    await executeUnseenCount()
  }
})

const pending = computed(() => {
  return unseenStatus.value === 'pending' || notificationsStatus.value === 'pending'
})

const show = computed(() => {
  if (!unseen.value || !unseen.value?.count) {
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
      notification: data.value?.find(n => n.id === notification.notification),
    }
  })
})

const onNotificationClick = async (id: number) => {
  await markAsSeen([id])
  await refreshNotifications()
}

const toggleDropdown = () => {
  isDropdownVisible.value = !isDropdownVisible.value
}

onClickOutside(dropdown, () => {
  isDropdownVisible.value = false
}, {
  ignore: [toggleButton],
})

watch(
  () => loggedIn.value,
  (isLoggedIn, previous) => {
    if (!previous && isLoggedIn) {
      execute()
      executeUnseenCount()
    }
  },
)
</script>

<template>
  <div class="relative grid items-center">
    <UChip
      :key="'notifications'"
      size="md"
      color="green"
      :show="show"
    >
      <UButton
        ref="toggleButton"
        class="p-0"
        :icon="isDropdownVisible ? 'i-heroicons-solid:bell' : 'i-heroicons-bell'"
        size="xl"
        :color="'primary'"
        :aria-label="$t('notifications.title')"
        :title="$t('notifications.title')"
        @click="toggleDropdown"
      />
    </UChip>
    <Transition>
      <div
        v-if="isDropdownVisible"
        ref="dropdown"
        class="
          bg-primary-50 absolute right-0 top-12 w-80 rounded-lg border
          border-gray-200 shadow-md

          dark:border-gray-800 dark:bg-primary-900

          lg:-right-12

          md:top-14
        "
      >
        <div class="notifications-list relative grid gap-2 p-2">
          <template v-if="!pending && userNotifications?.length">
            <UNotification
              v-for="userNotification in userNotifications"
              :id="userNotification.id"
              :key="userNotification.uuid"
              class="
                cursor-pointer

                dark:hover:bg-primary-800

                hover:bg-primary-100
              "
              :close-button="{
                icon: '',
              }"
              :timeout="0"
              :description="extractTranslated(userNotification.notification, 'message', locale)"
              :title="extractTranslated(userNotification.notification, 'title', locale)"
              @click="onNotificationClick(userNotification.id)"
            >
              <template #title="{ title }">
                <div class="relative w-full">
                  <LazyUChip
                    :id="`notification-${userNotification.notification?.id}`"
                    :key="`notification-${userNotification.notification?.id}`"
                    class="w-full"
                    size="md"
                    color="green"
                    :show="true"
                    :ui="{
                      wrapper: 'justify-start',
                    }"
                  >
                    <span class="notification-title truncate text-sm" v-html="title" />
                  </LazyUChip>
                </div>
              </template>
              <template #description="{ description }">
                <span class="notification-description text-xs" v-html="description" />
              </template>
            </UNotification>
          </template>
          <template v-else-if="pending">
            <ClientOnlyFallback
              :count="userNotifications?.length"
              height="90px"
            />
          </template>
          <template v-else-if="!userNotifications?.length">
            <div
              class="
                grid items-center justify-center justify-items-center gap-2 p-2
              "
            >
              <UIcon name="i-heroicons-bell-alert" class="h-12 w-12" />
              <p class="text-center text-sm">
                {{ $t('notifications.no_notifications') }}
              </p>
            </div>
          </template>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss" scoped>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.5s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
.notifications-list {
  &::before {
    content: "";
    position: absolute;
    bottom: 100%;
    width: 0;
    height: 0;
    border: solid transparent;
    margin-left: -10px;
    border-width: 10px;
    right: 3px;
    @apply border-b-gray-200 dark:border-b-gray-800;
    @media screen and (min-width: 1024px) {
      right: 49px;
      margin-left: -12px;
      border-width: 12px;
    }
  }
  &::after {
    content: "";
    position: absolute;
    bottom: 100%;
    width: 0;
    height: 0;
    border: solid transparent;
    margin-left: -8px;
    border-width: 8px;
    right: 5.5px;
    @apply border-b-primary-50 dark:border-b-primary-900;
    @media screen and (min-width: 1024px) {
      right: 51.5px;
      margin-left: -10px;
      border-width: 10px;
    }
  }
}
</style>

<style lang="scss">
.notification-title, .notification-description {
  a {
    text-decoration: underline;
  }
}
</style>
