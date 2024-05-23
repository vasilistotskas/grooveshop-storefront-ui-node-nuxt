<script lang="ts" setup>
import type { PropType } from 'vue'

import type { UserAccount } from '~/types/user/account'

const props = defineProps({
  account: {
    type: Object as PropType<UserAccount>,
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
      title: t('pages.account.username.edit.empty'),
      color: 'red',
    })
    return
  }

  try {
    const response = await $fetch(`/api/user/account/${account.value.id}/change-username`, {
      method: 'POST',
      body: { username: username.value },
    })

    toast.add({
      title: response?.detail || t('common.success'),
      color: 'green',
    })

    account.value.username = username.value
    await fetch()
  }
  catch (error) {
    toast.add({
      title: isErrorWithDetail(error) ? error.data.data.detail : t('common.unknown.error'),
      color: 'red',
    })
  }
}
</script>

<template>
  <div class="user-info">
    <div class="user-info-container">
      <div class="user-info-avatar">
        <UserAvatar
          :user-account="account"
          :img-width="imgWidth"
          :img-height="imgHeight"
          :show-name="false"
          :background-border="true"
          :change-avatar="true"
        />
      </div>
      <div class="user-info-name relative flex w-full items-center">
        <UButton
          size="sm"
          color="primary"
          :icon="userNameEditing ? 'i-heroicons-check' : 'i-heroicons-pencil'"
          :aria-label="userNameEditing ? $t('common.save') : $t('common.edit')"
          :title="userNameEditing ? $t('common.save') : $t('common.edit')"
          :ui="{
            icon: {
              base: userNameEditing ? 'bg-green-500 dark:bg-green-400' : '',
              size: {
                sm: 'h-4 w-4 md:h-5 md:w-5',
              },
            },
          }"
          @click="onEditUserName"
        />
        <UInput
          v-model="username"
          :disabled="!userNameEditing"
          size="sm"
          variant="none"
          color="primary"
          :class="!userNameEditing ? `
            text-primary-950 text-2xl

            dark:text-primary-50
          ` : ''"
          class="font-bold"
          :ui="{
            size: {
              sm: 'text-md md:text-2xl',
            },
            padding: {
              sm: 'px-0 py-0',
            },
          }"
          @keydown.enter="onEditUserName"
        />
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
            class="user-info-stats-item-link"
            :to="`/account/orders`"
            :title="$t('pages.account.orders.title')"
          >
            <UIcon
              name="i-heroicons-cube"
              class="h-6 w-6"
            />
            <span
              class="
                text-primary-950

                dark:text-primary-50
              "
            >{{
              $t('pages.account.orders.title')
            }}</span>

            <span
              class="
                text-primary-950 text-2xl font-bold

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
            class="user-info-stats-item-link"
            :to="`/account/favourites/products`"
            :title="$t('pages.account.favourites.products.title')"
          >
            <UIcon
              name="i-heroicons-heart"
              class="h-6 w-6"
            />
            <span
              class="
                text-primary-950

                dark:text-primary-50
              "
            >{{
              $t('pages.account.favourites.products.title')
            }}</span>
            <span
              class="
                text-primary-950 text-2xl font-bold

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
            class="user-info-stats-item-link"
            :to="`/account/reviews`"
            :title="$t('pages.account.reviews.title')"
          >
            <UIcon
              name="i-heroicons-star"
              class="h-6 w-6"
            />
            <span
              class="
                text-primary-950

                dark:text-primary-50
              "
            >{{
              $t('pages.account.reviews.title')
            }}</span>
            <span
              class="
                text-primary-950 text-2xl font-bold

                dark:text-primary-50
              "
            >{{ productReviewsCount }}</span>
          </Anchor>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.user {
  &-info {
    width: calc(100% - 128px);
    margin: 0 auto;
    display: grid;
    align-items: center;
    z-index: 20;

    @media screen and (width <= 767px) {
      width: 100%;
    }

    &-container {
      display: flex;
      align-items: center;
      padding-top: 1.5rem;
      padding-bottom: 1.5rem;
      gap: 2rem;

      @media screen and (width <= 767px) {
        display: grid;
        justify-items: center;
        align-items: center;
        justify-content: center;
        padding-top: 1rem;
        padding-bottom: 1rem;
        gap: 1rem;
      }
    }

    &-name {
      @media screen and (width <= 767px) {
        display: flex;
        align-items: center;
      }
    }

    &-stats {
      display: grid;
      align-items: center;
      margin-left: auto;
      gap: 1rem;
      grid-template-columns: repeat(3, minmax(110px, 1fr));

      @media screen and (width <= 767px) {
        width: 100%;
        display: flex;
        flex-wrap: wrap;
        grid-row: 2 / span 1;
        grid-column: 1 / span 2;
      }

      &-item {
        &-link {
          display: flex;
          flex-direction: column;
          padding: 0.5rem;
          align-items: center;
          margin-left: 1rem;

          &.router-link-active {
            @apply text-secondary dark:text-secondary-dark;
          }

          &:first-child {
            margin-left: 0;
          }

          & > svg {
            margin: 0;
          }
        }
      }
    }

    &-avatar {
      @media screen and (width <= 767px) {
        display: grid;
        width: 100%;
        justify-content: center;
      }
    }
  }
}
</style>
