import { withQuery } from 'ufo'
import type { UseWebNotificationOptions, UseWebSocketReturn } from '@vueuse/core'
import type { Composer } from 'vue-i18n'

export default defineNuxtPlugin({
  name: 'websocket',
  parallel: true,
  async setup(nuxtApp) {
    const websocketInstance = ref<UseWebSocketReturn<any> | null>(null)
    const config = useRuntimeConfig()
    const locale = (nuxtApp.$i18n as Composer).locale
    const toast = useToast()
    const { user, loggedIn } = useUserSession()
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore

    async function initializeWebSocket() {
      if (!loggedIn.value) {
        console.warn('User not logged in, skipping websocket initialization.')
        return
      }

      try {
        const tokens = await $fetch<{ sessionToken: string, accessToken: string }>('/api/websocket/user/tokens', {
          method: 'GET',
          headers: useRequestHeaders(),
        })

        const websocketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const djangoApiHostName = config.public.djangoHostName || `api.${window.location.hostname}`
        const wsEndpoint = withQuery(`${websocketProtocol}://${djangoApiHostName}/ws/notifications/`, {
          user_id: user.value?.id,
          session_token: tokens.sessionToken,
          access_token: tokens.accessToken,
        })

        const options: UseWebNotificationOptions = {
          dir: 'auto',
          lang: locale.value,
          icon: '/logo.svg',
          renotify: true,
          requireInteraction: false,
          vibrate: [200, 100, 200],
        }

        const { isSupported: isBroadcastChannelSupported, post } = useBroadcastChannel({ name: 'notifications' })
        const { isSupported: isWebNotificationSupported, show } = useWebNotification(options)

        websocketInstance.value = useWebSocket(wsEndpoint, {
          autoReconnect: true,
          onConnected: ws => console.info('WebSocket connected', ws),
          onDisconnected: (_ws, event) => console.info('WebSocket disconnected', event),
          onError: (_ws, event) => console.info('WebSocket error', event),
          onMessage: async (_ws, event) => {
            const data = JSON.parse(event.data)
            await setupNotifications()
            toast.add({
              title: data.translations[locale.value].title,
              description: data.translations[locale.value].message,
              color: 'success',
            })
            if (isBroadcastChannelSupported) {
              post(data)
            }
            if (isWebNotificationSupported) {
              await show({
                title: data.translations[locale.value].title,
                body: data.translations[locale.value].message,
                tag: data.type,
              })
            }
          },
        })
      }
      catch (error) {
        console.error('Failed to initialize websocket due to token error:', error)
      }
    }

    function closeWebSocket() {
      if (websocketInstance.value) {
        websocketInstance.value.close()
        websocketInstance.value = null
        console.info('WebSocket closed')
      }
    }

    watch(
      () => loggedIn.value,
      (isLoggedIn, previous) => {
        if (!previous && isLoggedIn) {
          initializeWebSocket()
        }
        else if (previous && !isLoggedIn) {
          closeWebSocket()
        }
      },
      { immediate: true },
    )

    return {
      provide: {
        websocket: () => websocketInstance.value,
      },
    }
  },
})
