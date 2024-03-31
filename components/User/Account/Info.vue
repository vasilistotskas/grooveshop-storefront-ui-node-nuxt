<script lang="ts" setup>
import type { PropType } from 'vue'

import type { UserAccount } from '~/types/user/account'

defineProps({
  account: {
    type: Object as PropType<UserAccount>,
    required: true,
  },
  ordersCount: {
    type: Number,
    required: false,
    default: 0,
  },
  favouritesCount: {
    type: Number,
    required: false,
    default: 0,
  },
  reviewsCount: {
    type: Number,
    required: false,
    default: 0,
  },
})
</script>

<template>
  <div class="user-info">
    <div class="user-info-container">
      <div class="user-info-avatar">
        <UserAvatar
          :user-account="account"
          :img-width="135"
          :img-height="135"
          :show-name="false"
          :background-border="true"
          :change-avatar="true"
        />
      </div>
      <div class="user-info-name">
        <h2
          v-if="account?.firstName || account?.lastName"
          class="text-primary-900 dark:text-primary-100 text-2xl font-bold"
        >
          {{ account.firstName }} {{ account.lastName }}
        </h2>
      </div>
      <div class="user-info-stats">
        <div v-if="ordersCount" class="user-info-stats-item">
          <Anchor
            class="user-info-stats-item-link"
            :to="`/account/orders`"
            :title="$t('pages.account.orders.title')"
          >
            <UIcon name="i-heroicons-cube" class="h-6 w-6" />
            <span class="text-primary-800 dark:text-primary-100">{{
              $t('pages.account.orders.title')
            }}</span>

            <span
              class="text-primary-900 dark:text-primary-100 text-2xl font-bold"
              >{{ ordersCount }}</span
            >
          </Anchor>
        </div>
        <div v-if="favouritesCount" class="user-info-stats-item">
          <Anchor
            class="user-info-stats-item-link"
            :to="`/account/favourites`"
            :title="$t('pages.account.favourites.title')"
          >
            <UIcon name="i-heroicons-heart" class="h-6 w-6" />
            <span class="text-primary-800 dark:text-primary-100">{{
              $t('pages.account.favourites.title')
            }}</span>
            <span
              class="text-primary-900 dark:text-primary-100 text-2xl font-bold"
              >{{ favouritesCount }}</span
            >
          </Anchor>
        </div>
        <div v-if="reviewsCount" class="user-info-stats-item">
          <Anchor
            class="user-info-stats-item-link"
            :to="`/account/reviews`"
            :title="$t('pages.account.reviews.title')"
          >
            <UIcon name="i-heroicons-star" class="h-6 w-6" />
            <span class="text-primary-800 dark:text-primary-100">{{
              $t('pages.account.reviews.title')
            }}</span>
            <span
              class="text-primary-900 dark:text-primary-100 text-2xl font-bold"
              >{{ reviewsCount }}</span
            >
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
      font-size: 1.25rem;
      font-weight: 600;

      @media screen and (width <= 767px) {
        grid-row: 1 / span 1;
        grid-column: 2 / span 1;
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
            @apply text-secondary;
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
        justify-content: start;
        grid-row: 1 / span 1;
        grid-column: 1 / span 1;
      }
    }
  }
}
</style>
