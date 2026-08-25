<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonProps } from '#ui/types'

// Merchant feature toggle — one gate here covers every call site
// (product cards, detail page, favourites lists). Fails OPEN.
const favouritesEnabled = useSettingFlag('FAVOURITES_ENABLED', {
  fallback: true,
})

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
        // ofetch only populates context.error for transport/parse
        // failures — on an HTTP 4xx/5xx it is undefined, so the old
        // `title: error?.message` rendered an empty toast.
        onResponseError({ response }) {
          toast.add({
            title: getErrorDetail({ data: response._data }) || t('error_occurred'),
            color: 'error',
          })
        },
      })
    }
    else {
      const id = props.favouriteId
      await $fetch(`/api/products/favourites/${id}`, {
        method: 'DELETE',
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
        // ofetch only populates context.error for transport/parse
        // failures — on an HTTP 4xx/5xx it is undefined, so the old
        // `title: error?.message` rendered an empty toast.
        onResponseError({ response }) {
          toast.add({
            title: getErrorDetail({ data: response._data }) || t('error_occurred'),
            color: 'error',
          })
        },
      })
    }
  }
  catch (error) {
    log.error({ action: 'favourite:toggle', error })
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
    v-if="favouritesEnabled"
    :size="size"
    :label="buttonLabel"
    :icon="favouriteId ? 'i-heroicons-heart-solid' : 'i-heroicons-heart'"
    :color="favouriteId ? 'error' : 'neutral'"
    variant="subtle"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
    :loading="isLoading"
    :disabled="isLoading"
    :ui="{
      base: `
        cursor-pointer
        hover:bg-transparent
      `,
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
