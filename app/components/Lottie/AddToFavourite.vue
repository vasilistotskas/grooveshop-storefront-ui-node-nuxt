<script lang="ts" setup>
import type { PropType } from 'vue'

import heartJSON from '~/assets/lotties/heart.json'
import type Lottie from '~/components/Lottie/index.vue'
import type { ButtonSize } from '#ui/types'

const props = defineProps({
  productId: {
    type: Number as PropType<number>,
    required: true,
  },
  userId: {
    type: Number as PropType<number | null | undefined>,
    required: false,
    default: undefined,
  },
  favouriteId: {
    type: Number as PropType<number | null>,
    required: false,
    default: null,
  },
  size: {
    type: String as PropType<ButtonSize>,
    default: 'md',
  },
})

const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { addFavouriteProduct, removeFavouriteProduct } = userStore

const lottie = ref<InstanceType<typeof Lottie>>()

const toggleFavourite = async () => {
  if (!loggedIn.value || !props.userId) {
    toast.add({
      title: t('not_authenticated'),
      color: 'red',
    })
    return
  }
  if (!props.favouriteId) {
    await $fetch<ProductFavourite>(`/api/products/favourites`, {
      method: 'POST',
      headers: useRequestHeaders(),
      body: {
        product: String(props.productId),
        user: String(props.userId),
      },
      query: {
        expand: 'true',
      },
      onRequestError({ error }) {
        toast.add({
          title: error.message,
          color: 'red',
        })
      },
      onResponse({ response }) {
        if (!response.ok) {
          return
        }
        addFavouriteProduct(response._data)
        lottie.value?.play()
        toast.add({
          title: t('added'),
          color: 'green',
        })
      },
      onResponseError({ error }) {
        toast.add({
          title: error?.message,
          color: 'red',
        })
      },
    })
  }
  else {
    const id = props.favouriteId
    await $fetch(`/api/products/favourites/${id}`, {
      method: 'DELETE',
      headers: useRequestHeaders(),
      onRequestError({ error }) {
        toast.add({
          title: error.message,
          color: 'red',
        })
      },
      onResponse({ response }) {
        if (!response.ok) {
          return
        }
        removeFavouriteProduct(props.productId)
        lottie.value?.goToAndStop(0)
        toast.add({
          title: t('removed'),
          color: 'red',
        })
      },
      onResponseError({ error }) {
        toast.add({
          title: error?.message,
          color: 'red',
        })
      },
    })
  }
}

const buttonLabel = computed(() => {
  return props.favouriteId
    ? t('remove')
    : t('add')
})

const buttonAreaLabel = computed(() => {
  return props.favouriteId
    ? t('remove')
    : t('add')
})

const onAnimationLoaded = () => {
  if (props.favouriteId) {
    lottie.value?.goToAndStop(lottie.value?.getDuration() - 1 || 0)
  }
  else {
    lottie.value?.goToAndStop(0)
  }
}
</script>

<template>
  <LazyLottie
    ref="lottie"
    :text="buttonLabel"
    :component-element="'button'"
    :size="size"
    :animation-data="heartJSON"
    :width="'40px'"
    :height="'40px'"
    :loop="false"
    :auto-play="false"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
    @on-animation-loaded="onAnimationLoaded"
    @click="toggleFavourite"
  />
</template>

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να προσθέσεις στα αγαπημένα
  added: Προστέθηκε στα αγαπημένα
  removed: Αφαιρέθηκε από τα αγαπημένα
  add: Προσθήκη στα αγαπημένα
  remove: Αφαίρεση από τα αγαπημένα
</i18n>
