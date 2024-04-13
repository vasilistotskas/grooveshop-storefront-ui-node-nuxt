<script lang="ts" setup>
import type { PropType } from 'vue'

import type { ButtonSize } from '~/types/global/button'
import type { ProductFavourite } from '~/types/product/favourite'

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
    validator: (value: string) => ['lg', 'md', 'sm', 'xs'].includes(value),
  },
  showLabel: {
    type: Boolean,
    default: false,
  },
})

const themeCookie = useCookie('theme')
const isDark = computed(() => themeCookie.value === 'dark')

const { t } = useI18n()
const toast = useToast()
const { loggedIn } = useUserSession()

const toggleFavourite = async () => {
  if (!loggedIn.value || !props.userId) {
    toast.add({
      title: t('components.add_to_favourite_button.not_authenticated'),
      color: 'red',
    })
    return
  }
  if (!props.favourite) {
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
    const id = props.favourite?.id
    await $fetch(`/api/products/favourites/${id}`, {
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
  return props.favourite
    ? t('components.add_to_favourite_button.remove')
    : t('components.add_to_favourite_button.add')
})

const buttonAreaLabel = computed(() => {
  return props.favourite
    ? t('components.add_to_favourite_button.remove')
    : t('components.add_to_favourite_button.add')
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
    :color="'white'"
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
