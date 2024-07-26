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

const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const localePath = useLocalePath()

const onClickLogout = async () => {
  if (isRouteProtected(route.path))
    await navigateTo(localePath('/'))

  await deleteSession()

  cleanCartState()
  cleanAccountState()

  await refreshCart()
}
</script>

<template>
  <UButton
    :aria-label="$t('common.logout')"
    :color="color"
    :label="$t('common.logout')"
    :size="size"
    :title="$t('common.logout')"
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
