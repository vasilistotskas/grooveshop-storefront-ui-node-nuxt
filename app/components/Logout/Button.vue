<script lang="ts" setup>
import type { PropType } from 'vue'
import type { ButtonProps } from '#ui/types'

defineProps({
  size: {
    type: String as PropType<ButtonProps['size']>,
    default: 'xl',
  },
})

const { t } = useI18n()
const cartStore = useCartStore()
const { cleanCartState, refreshCart } = cartStore

const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const localePath = useLocalePath()
const { $routeBaseName } = useNuxtApp()

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
    log.error({ action: 'auth:logout', error })
  }
}
</script>

<template>
  <UButton
    :aria-label="t('logout')"
    :color="'error'"
    :label="t('logout')"
    :size="size"
    :title="t('logout')"
    :variant="'subtle'"
    @click="onClickLogout"
  />
</template>
