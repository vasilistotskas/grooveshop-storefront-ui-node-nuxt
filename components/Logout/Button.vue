<script lang="ts" setup>
import type { PropType } from 'vue'
import { AuthenticatedRoutePrefixes } from '~/constants'
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

const { session, clear } = useUserSession()
const { logout } = useAuth()
const route = useRoute()

const onClickLogout = async () => {
  const isRouteProtected = AuthenticatedRoutePrefixes.some(prefix =>
    route.path.startsWith(prefix),
  )

  if (isRouteProtected)
    await navigateTo('/')

  await Promise.all([
    logout({
      refresh: session.value?.refreshToken,
    }),
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
