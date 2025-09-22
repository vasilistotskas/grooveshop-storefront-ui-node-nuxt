<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  account: {
    type: Object as PropType<Authentication>,
    required: true,
  },
  ordersCount: {
    type: Number,
    required: false,
    default: 0,
  },
  productFavouritesCount: {
    type: Number,
    required: false,
    default: 0,
  },
  productReviewsCount: {
    type: Number,
    required: false,
    default: 0,
  },
})

const { account } = toRefs(props)
const { isMobileOrTablet } = useDevice()
const toast = useToast()
const { t } = useI18n()
const { fetch } = useUserSession()
const { $i18n } = useNuxtApp()

const userNameEditing = ref(false)
const username = ref(account.value.username || account.value.email || '')
const imgWidth = computed(() => (isMobileOrTablet ? 96 : 144))
const imgHeight = computed(() => (isMobileOrTablet ? 96 : 144))

const onEditUserName = async () => {
  if (userNameEditing.value) {
    await changeUserName()
  }
  userNameEditing.value = !userNameEditing.value
}

const changeUserName = async () => {
  if (!username.value) {
    toast.add({
      title: t('username.empty'),
      color: 'error',
    })
    return
  }

  try {
    const response = await $fetch(`/api/user/account/${account.value.id}/change-username`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: { username: username.value },
    })

    toast.add({
      title: response?.detail || $i18n.t('success.title'),
      color: 'success',
    })

    account.value.username = username.value
    await fetch()
  }
  catch (error) {
    toast.add({
      title: isErrorWithDetail(error) ? error.data.data.detail : t('unknown.error'),
      color: 'error',
    })
  }
}
</script>

<template>
  <div class="user-info mx-auto w-full max-w-(--container-7xl) p-0">
    <div class="user-info-container">
      <div class="user-info-avatar">
        <UserAvatar
          :background-border="true"
          :change-avatar="true"
          :img-height="imgHeight"
          :img-width="imgWidth"
          :show-name="false"
          :user-account="account"
        />
      </div>
      <div class="user-info-name relative flex w-full flex-col">
        <div class="flex w-full items-center">
          <UButton
            :aria-label="userNameEditing ? $i18n.t('save') : $i18n.t('edit.title')"
            :icon="userNameEditing ? 'i-heroicons-check' : 'i-heroicons-pencil'"
            :title="userNameEditing ? $i18n.t('save') : $i18n.t('edit.title')"
            color="neutral"
            variant="ghost"
            size="lg"
            :ui="{
              base: 'hover:bg-transparent cursor-pointer p-0',
            }"
            @click="onEditUserName"
          />
          <UInput
            v-model="username"
            :class="!userNameEditing ? `
              text-primary-950
              dark:text-primary-50
            ` : ''"
            :disabled="!userNameEditing"
            class="font-bold"
            size="xl"
            variant="none"
            @keydown.enter="onEditUserName"
          />
        </div>
        <span
          class="
            w-full cursor-text items-center truncate p-1.5 text-sm font-medium
            text-neutral-700 opacity-50 select-text
            dark:text-neutral-200
          "
        >
          {{ account.email }}
        </span>
      </div>
      <div
        v-if="ordersCount || productFavouritesCount || productReviewsCount"
        class="user-info-stats"
      >
        <div
          v-if="ordersCount"
          class="user-info-stats-item"
        >
          <Anchor
            :title="t('orders')"
            :to="'account-orders'"
            class="user-info-stats-item-link"
          >
            <UIcon
              class="size-6"
              name="i-heroicons-cube"
            />
            <span
              class="
                text-primary-950
                dark:text-primary-50
              "
            >{{
              t('orders')
            }}</span>

            <span
              class="
                text-2xl font-bold text-primary-950
                dark:text-primary-50
              "
            >{{ ordersCount }}</span>
          </Anchor>
        </div>
        <div
          v-if="productFavouritesCount"
          class="user-info-stats-item"
        >
          <Anchor
            :title="t('favourite.products')"
            :to="'account-favourites-products'"
            class="user-info-stats-item-link"
          >
            <UIcon
              class="size-6"
              name="i-heroicons-heart"
            />
            <span
              class="
                text-primary-950
                dark:text-primary-50
              "
            >{{
              t('favourite.products')
            }}</span>
            <span
              class="
                text-2xl font-bold text-primary-950
                dark:text-primary-50
              "
            >{{ productFavouritesCount }}</span>
          </Anchor>
        </div>
        <div
          v-if="productReviewsCount"
          class="user-info-stats-item"
        >
          <Anchor
            :title="t('reviews')"
            :to="'account-reviews'"
            class="user-info-stats-item-link"
          >
            <UIcon
              class="size-6"
              name="i-heroicons-star"
            />
            <span
              class="
                text-primary-950
                dark:text-primary-50
              "
            >{{
              t('reviews')
            }}</span>
            <span
              class="
                text-2xl font-bold text-primary-950
                dark:text-primary-50
              "
            >{{ productReviewsCount }}</span>
          </Anchor>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.user-info {
  width: calc(100% - 128px);
  margin: 0 auto;
  display: grid;
  align-items: center;
  z-index: 20;
}

@media screen and (max-width: 767px) {
  .user-info {
    width: 100%;
  }
}

.user-info-container {
  display: flex;
  align-items: center;
  padding-top: 1.5rem;
  padding-bottom: 1.5rem;
  gap: 2rem;
}

@media screen and (max-width: 767px) {
  .user-info-container {
    display: flex;
    justify-items: center;
    align-items: center;
    justify-content: center;
    padding-top: 1rem;
    padding-bottom: 1rem;
    gap: 1rem;
  }
}

@media screen and (max-width: 767px) {
  .user-info-name {
    display: flex;
    align-items: center;
  }
}

.user-info-stats {
  display: grid;
  align-items: center;
  margin-left: auto;
  gap: 1rem;
  grid-template-columns: repeat(3, minmax(110px, 1fr));
}

@media screen and (max-width: 767px) {
  .user-info-stats {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    grid-row: 2 / span 1;
    grid-column: 1 / span 2;
  }
}

.user-info-stats-item-link {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
  align-items: center;
  margin-left: 1rem;
}

.user-info-stats-item-link:first-child {
  margin-left: 0;
}

.user-info-stats-item-link > svg {
  margin: 0;
}

@media screen and (max-width: 767px) {
  .user-info-avatar {
    padding: 0 1rem;
    display: grid;
    width: auto;
    justify-content: start;
  }
}
</style>

<i18n lang="yaml">
el:
  orders: Παραγγελίες
  username:
    empty: Το όνομα χρήστη δεν μπορεί να είναι κενό
  favourite:
    products: Αγαπημένα προϊόντα
  reviews: Κριτικές
</i18n>
