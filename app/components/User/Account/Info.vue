<script lang="ts" setup>
import type { PropType } from 'vue'

const props = defineProps({
  account: {
    type: Object as PropType<UserDetails>,
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
const toast = useToast()
const { t } = useI18n()
const { fetch } = useUserSession()
const { $i18n } = useNuxtApp()

const userNameEditing = ref(false)
const username = ref(account.value.username || account.value.email || '')

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
  <div
    class="
      z-20 mx-auto grid w-full max-w-(--container-7xl) items-center p-0
      md:w-[calc(100%-8rem)]
    "
  >
    <div
      class="
        flex items-center justify-center gap-4 px-2 py-4
        md:justify-start md:gap-8 md:py-6
      "
    >
      <div
        class="
          grid w-auto justify-start px-0
          md:px-4
        "
      >
        <UserAvatar
          :change-avatar="true"
          size="7xl"
          :show-name="false"
          :user-account="account"
        />
      </div>
      <div
        class="
          relative flex w-full flex-col
          md:items-start
        "
      >
        <div class="flex w-full items-center">
          <UButton
            :aria-label="userNameEditing ? $i18n.t('save') : $i18n.t('edit.title')"
            :icon="userNameEditing ? 'i-heroicons-check' : 'i-heroicons-pencil'"
            :title="userNameEditing ? $i18n.t('save') : $i18n.t('edit.title')"
            color="neutral"
            variant="ghost"
            size="lg"
            :ui="{
              base: `
                cursor-pointer p-0
                hover:bg-transparent
              `,
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
        class="
          flex w-full grid-cols-1 flex-wrap gap-4
          md:ml-auto md:grid md:w-auto md:min-w-[330px] md:grid-cols-3
          md:items-center
        "
      >
        <div
          v-if="ordersCount"
          class="
            flex-1
            md:flex-none
          "
        >
          <Anchor
            :title="t('orders')"
            :to="'account-orders'"
            class="
              ml-0 flex flex-col items-center p-2
              first:ml-0
            "
          >
            <UIcon
              class="m-0 size-6"
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
          class="
            flex-1
            md:flex-none
          "
        >
          <Anchor
            :title="t('favourite.products')"
            :to="'account-favourites-products'"
            class="
              ml-0 flex flex-col items-center p-2
              first:ml-0
              md:ml-4
            "
          >
            <UIcon
              class="m-0 size-6"
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
          class="
            flex-1
            md:flex-none
          "
        >
          <Anchor
            :title="t('reviews')"
            :to="'account-reviews'"
            class="
              ml-0 flex flex-col items-center p-2
              first:ml-0
              md:ml-4
            "
          >
            <UIcon
              class="m-0 size-6"
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

<i18n lang="yaml">
el:
  orders: Παραγγελίες
  username:
    empty: Το όνομα χρήστη δεν μπορεί να είναι κενό
  favourite:
    products: Αγαπημένα προϊόντα
  reviews: Κριτικές
</i18n>
