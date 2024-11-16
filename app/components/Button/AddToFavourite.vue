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
  favourite: {
    type: Object as PropType<ProductFavourite | null>,
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

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')

const { t } = useI18n({ useScope: 'local' })
const toast = useToast()
const { loggedIn } = useUserSession()

const toggleFavourite = async () => {
  if (!loggedIn.value || !props.userId) {
    toast.add({
      title: t('not_authenticated'),
      color: 'red',
    })
    return
  }
  if (!props.favourite) {
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
    const id = props.favourite?.id
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
  if (!props.showLabel) return ''
  return props.favourite
    ? t('remove')
    : t('add')
})

const buttonAreaLabel = computed(() => {
  return props.favourite
    ? t('remove')
    : t('add')
})

const backgroundColor = computed(() => {
  return props.favourite ? 'rgb(239 68 68)' : isDark.value ? 'white' : 'black'
})
</script>

<template>
  <UButton
    class="add-to-favourite-btn"
    :size="size"
    :label="buttonLabel"
    :icon="!favourite ? 'i-heroicons-heart' : 'i-heroicons-heart'"
    :color="'primary'"
    :aria-label="buttonAreaLabel"
    :title="buttonAreaLabel"
    @click="toggleFavourite"
  />
</template>

<style lang="scss" scoped>
:deep(.i-heroicons-heart) {
  background-color: v-bind(backgroundColor);
}
</style>

<i18n lang="yaml">
el:
  not_authenticated: Πρέπει να είσαι συνδεδεμένος για να προσθέσεις στα αγαπημένα
  added: Προστέθηκε στα αγαπημένα
  removed: Αφαιρέθηκε από τα αγαπημένα
  add: Προσθήκη στα αγαπημένα
  remove: Αφαίρεση από τα αγαπημένα
</i18n>
