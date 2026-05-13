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
const { deleteSession } = useAllAuthAuthentication()
const route = useRoute()
const localePath = useLocalePath()
const { $routeBaseName } = useNuxtApp()
const userInitiatedLogout = useState<boolean>('auth:userInitiatedLogout', () => false)

const routeName = computed(() => $routeBaseName(route))

const onClickLogout = async () => {
  if (!routeName.value) return
  if (isRouteProtected(String(routeName.value)))
    await navigateTo(localePath('index'))

  // Set the explicit flag SYNCHRONOUSLY before the network call so any
  // concurrent 410 (e.g. from a background poll racing the DELETE) still
  // sees wasExplicit=true and suppresses the session-expired toast.
  userInitiatedLogout.value = true

  try {
    await deleteSession({ explicit: true })
    // The auth:change LOGGED_OUT cascade handles everything else:
    // clearAuthState/clearAccountState/clearNotificationsState (auth plugin)
    // + cleanCartState (setup.ts loggedIn watcher) + navigateTo home.
    // Calling cleanCartState() / refreshCart() here would race the
    // server-side cart cleanup (just added to session.delete.ts finally)
    // and create a phantom anonymous cart.
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
