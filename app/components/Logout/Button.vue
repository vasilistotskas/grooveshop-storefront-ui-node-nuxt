<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '@nuxt/ui'

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
const { $i18n, $routeBaseName } = useNuxtApp()

const routeName = computed(() => $routeBaseName(route))

const onClickLogout = async () => {
  if (!routeName.value) return
  if (isRouteProtected(routeName.value))
    await navigateTo(localePath('index'))

  cleanCartState()

  try {
    await deleteSession()
    await refreshCart()
  }
  catch (error) {
    console.error('Logout failed:', error)
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
