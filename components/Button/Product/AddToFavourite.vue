<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize } from '#ui/types'

const props = defineProps({
  productId: {
    type: Number as PropType<number>,
    required: true,
  },
  userId: {
    type: Number as PropType<number | undefined>,
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
  showLabel: {
    type: Boolean,
    default: false,
  },
})

const { t } = useI18n()
const toast = useToast()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { addFavouriteProduct, removeFavouriteProduct } = userStore

const toggleFavourite = async () => {
  if (!loggedIn.value || !props.userId) {
    toast.add({
      title: t('components.add_to_favourite_button.not_authenticated'),
      color: 'red',
    })
    return
  }
  if (!props.favouriteId) {
    await $fetch(`/api/products/favourites`, {
      method: 'POST',
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
        toast.add({
          title: t('components.add_to_favourite_button.added'),
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
    await useFetch(`/api/products/favourites/${id}`, {
      method: 'DELETE',
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
        toast.add({
          title: t('components.add_to_favourite_button.removed'),
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
  if (!props.showLabel) return ''
  return props.favouriteId
    ? t('components.add_to_favourite_button.remove')
    : t('components.add_to_favourite_button.add')
})

const buttonAreaLabel = computed(() => {
  return props.favouriteId
    ? t('components.add_to_favourite_button.remove')
    : t('components.add_to_favourite_button.add')
})
</script>

<template>
  <UButton
    class="add-to-favourite-btn"
    :size="size"
    :label="buttonLabel"
    :icon="!favouriteId ? 'i-heroicons-heart' : 'i-heroicons-heart'"
    :color="'gray'"
    variant="ghost"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
    :ui="{
      icon: {
        base: favouriteId ? 'bg-red-500' : '',
      },
    }"
    @click="toggleFavourite"
  />
</template>
