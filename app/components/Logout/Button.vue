<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

defineProps({
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'sm',
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
    :color="'error'"
    :label="$i18n.t('logout')"
    :size="size"
    :title="$i18n.t('logout')"
    :variant="'subtle'"
    icon="i-heroicons-arrow-left-end-on-rectangle"
    @click="onClickLogout"
  />
</template>
