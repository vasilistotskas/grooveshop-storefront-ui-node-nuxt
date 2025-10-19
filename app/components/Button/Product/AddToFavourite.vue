<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonProps } from '@nuxt/ui'

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
    type: String as PropType<ButtonProps['size']>,
    default: 'md',
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'favourite-delete', id: number): void
}>()

const { t } = useI18n()
const toast = useToast()
const { loggedIn } = useUserSession()
const userStore = useUserStore()
const { addFavouriteProduct, removeFavouriteProduct } = userStore

const isLoading = ref(false)

const toggleFavourite = async () => {
  if (!loggedIn.value || !props.userId) {
    toast.add({
      title: t('not_authenticated'),
      color: 'error',
    })
    return
  }

  if (isLoading.value) {
    return
  }

  try {
    isLoading.value = true
    if (!props.favouriteId) {
      await $fetch(`/api/products/favourites`, {
        method: 'POST',
        headers: useRequestHeaders(),
        body: {
          product: props.productId,
        },
        onRequestError({ error }) {
          toast.add({
            title: error.message,
            color: 'error',
          })
        },
        onResponse({ response }) {
          if (!response.ok) {
            return
          }
          addFavouriteProduct(response._data)
          toast.add({
            title: t('added'),
            color: 'success',
          })
        },
        onResponseError({ error }) {
          toast.add({
            title: error?.message,
            color: 'error',
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
            color: 'error',
          })
        },
        onResponse({ response }) {
          if (!response.ok) {
            return
          }
          emit('favourite-delete', id)
          removeFavouriteProduct(props.productId)
          toast.add({
            title: t('removed'),
            color: 'error',
          })
        },
        onResponseError({ error }) {
          toast.add({
            title: error?.message,
            color: 'error',
          })
        },
      })
    }
  }
  catch (error) {
    console.error('Favorite toggle error:', error)
    toast.add({
      title: 'An error occurred',
      color: 'error',
    })
  }
  finally {
    isLoading.value = false
  }
}

const buttonLabel = computed(() => {
  if (!props.showLabel) return undefined
  return props.favouriteId
    ? t('remove')
    : t('add')
})

const buttonAreaLabel = computed(() => {
  return props.favouriteId
    ? t('remove')
    : t('add')
})
</script>

<template>
  <UButton
    :size="size"
    :label="buttonLabel"
    :icon="!favouriteId ? 'i-heroicons-heart' : 'i-heroicons-heart'"
    :color="favouriteId ? 'error' : 'neutral'"
    variant="subtle"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
    :loading="isLoading"
    :disabled="isLoading"
    :ui="{
      base: 'hover:bg-transparent cursor-pointer',
    }"
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
