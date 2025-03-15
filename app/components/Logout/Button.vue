<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonSize, ButtonVariant } from '#ui/types'
import type { ButtonColor } from '#ui/types/button'

defineProps({
  size: {
    type: String as PropType<ButtonSize>,
    default: 'sm',
  },
  variant: {
    type: String as PropType<ButtonVariant>,
    default: 'solid',
  },
  color: {
    type: String as PropType<ButtonColor>,
    default: 'red',
  },
})

const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const localePath = useLocalePath()
const { $i18n } = useNuxtApp()

const onClickLogout = async () => {
  if (isRouteProtected(route.path))
    await navigateTo(localePath('index'))

  cleanCartState()

  try {
    await deleteSession()
    await refreshCart()
  }
  catch {
    // do nothing
  }
}
</script>

<template>
  <UButton
    :aria-label="$i18n.t('logout')"
    :color="color"
    :label="$i18n.t('logout')"
    :size="size"
    :title="$i18n.t('logout')"
    :ui="{
      font: 'font-semibold',
      size: {
        xl: 'text-xl',
      },
      icon: {
        size: {
          xl: 'h-7 w-7',
        },
      },
    }"
    :variant="variant"
    icon="i-heroicons-arrow-left-end-on-rectangle"
    @click="onClickLogout"
  />
</template>
