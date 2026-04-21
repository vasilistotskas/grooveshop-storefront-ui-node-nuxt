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
    const debouncedSetupNotifications = useDebounceFn(setupNotifications, 1000)
    const { presentationFor } = useNotificationPresentation()

    async function initializeWebSocket() {
      closeWebSocket()
      if (!loggedIn.value) {
        log.warn('ws', 'User not logged in, skipping websocket initialization.')
        return
      }

      try {
        // Single-use 60s ticket — see server/api/websocket/user/ticket.get.ts.
        // Never put the Knox access token in the URL; it is logged by
        // every proxy layer and lives for 7 days.
        const response = await $fetch<{ ticket: string, expiresIn: number }>('/api/websocket/user/ticket', {
          method: 'GET',
          headers: useRequestHeaders(),
        })
        if (!response?.ticket) {
          log.warn('ws', 'No ticket returned from /api/websocket/user/ticket')
          return
        }

        const websocketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const djangoApiHostName = config.public.djangoHostName || `api.${window.location.hostname}`
        const wsEndpoint = withQuery(`${websocketProtocol}://${djangoApiHostName}/ws/notifications/`, {
          user_id: user.value?.id,
          ticket: response.ticket,
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
          onConnected: () => { log.info('ws', 'Connected') },
          onDisconnected: (_ws, event) => { log.info('ws', 'Disconnected', { reason: event?.reason }) },
          onError: () => { log.error({ action: 'ws:error' }) },
          onMessage: async (_ws, event) => {
            const data = JSON.parse(event.data)
            debouncedSetupNotifications()

            // Resolve the active locale's copy with graceful fallback
            // so a missing translation doesn't crash the toast (the
            // backend ships ``{el, en, de}`` but an older schema or a
            // hand-authored admin broadcast might miss the active one).
            const localized = data?.translations?.[locale.value]
              ?? data?.translations?.en
              ?? data?.translations?.el
              ?? { title: '', message: '' }

            const presentation = presentationFor(data.kind, data.category)

            toast.add({
              title: localized.title,
              description: localized.message,
              color: presentation.color,
              icon: presentation.icon,
            })
            if (isBroadcastChannelSupported) {
              post(data)
            }
            if (isWebNotificationSupported) {
              await show({
                title: localized.title,
                body: localized.message,
                // ``notification_type`` (e.g. ``order_shipped``) is a
                // stable, shared-across-users tag so the OS-level
                // replacement behavior actually collapses duplicates.
                // Falls back to ``data.type`` (the channel-layer event
                // name) for notifications without an explicit subtype.
                tag: data.notification_type || data.type,
              })
            }
          },
        })
      }
      catch (error) {
        log.error({ action: 'ws:init', error })
      }
    }

    function closeWebSocket() {
      if (websocketInstance.value) {
        websocketInstance.value.close()
        websocketInstance.value = null
        log.info('ws', 'Closed')
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
