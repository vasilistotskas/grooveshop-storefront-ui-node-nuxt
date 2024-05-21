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

const userStore = useUserStore()
const { cleanAccountState } = userStore
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { clear } = useUserSession()
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()

const onClickLogout = async () => {
  if (isRouteProtected(route.path))
    await navigateTo('/')

  await Promise.all([
    deleteSession(),
    clear(),
  ])

  cleanCartState()
  cleanAccountState()

  await refreshCart()
}
</script>

<template>
  <UButton
    icon="i-heroicons-arrow-left-end-on-rectangle"
    :size="size"
    :variant="variant"
    :label="$t('common.logout')"
    :title="$t('common.logout')"
    :aria-label="$t('common.logout')"
    :color="color"
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
    @click="onClickLogout"
  />
</template>
