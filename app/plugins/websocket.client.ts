import { withQuery } from 'ufo'
import type { UseWebNotificationOptions } from '@vueuse/core'
import type { Composer } from 'vue-i18n'

export default defineNuxtPlugin({
  name: 'websocket',
  parallel: true,
  async setup(nuxtApp) {
    const config = useRuntimeConfig()
    const locale = (nuxtApp.$i18n as Composer).locale
    const toast = useToast()
    const { user, loggedIn } = useUserSession()
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore
    const debouncedSetupNotifications = useDebounceFn(setupNotifications, 1000)
    const { presentationFor } = useNotificationPresentation()

    // BroadcastChannel for cross-tab coordination (notifications + logout).
    // D = incoming data type, P = outgoing post type (both are plain objects).
    const { isSupported: isBroadcastChannelSupported, post, data: broadcastData } = useBroadcastChannel<Record<string, unknown>, Record<string, unknown>>({ name: 'notifications' })

    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempt = 0
    let ws: ReturnType<typeof useWebSocket> | null = null

    function closeWebSocket() {
      if (ws) {
        ws.close()
        ws = null
        log.info('ws', 'Closed')
      }
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

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

        const notificationOptions: UseWebNotificationOptions = {
          dir: 'auto',
          lang: locale.value,
          icon: '/logo.svg',
          renotify: true,
          requireInteraction: false,
          vibrate: [200, 100, 200],
        }

        const { isSupported: isWebNotificationSupported, show } = useWebNotification(notificationOptions)

        ws = useWebSocket(wsEndpoint, {
          // Ticket is single-use and consumed on connect — autoReconnect
          // would reuse the same (dead) URL. Instead we handle reconnection
          // manually via onDisconnected so each attempt fetches a fresh ticket.
          autoReconnect: false,
          heartbeat: { message: 'ping', interval: 30000, pongTimeout: 5000 },
          onConnected: () => {
            reconnectAttempt = 0
            log.info('ws', 'Connected')
          },
          onDisconnected: (_wsConn, event) => {
            log.info('ws', 'Disconnected', { reason: event?.reason })
            if (!loggedIn.value) return
            const delay = Math.min(1000 * 2 ** reconnectAttempt, 30000)
            reconnectAttempt++
            log.info('ws', 'Reconnecting', { attempt: reconnectAttempt, delayMs: delay })
            reconnectTimer = setTimeout(() => {
              if (loggedIn.value) {
                initializeWebSocket()
              }
            }, delay)
          },
          onError: () => { log.error({ action: 'ws:error' }) },
          onMessage: async (_wsConn, event) => {
            let data
            try {
              data = JSON.parse(event.data) as Record<string, unknown>
            }
            catch (parseErr) {
              log.error({ action: 'ws:parse', error: parseErr })
              return
            }

            debouncedSetupNotifications()

            // Resolve the active locale's copy with graceful fallback
            // so a missing translation doesn't crash the toast (the
            // backend ships ``{el, en, de}`` but an older schema or a
            // hand-authored admin broadcast might miss the active one).
            const translations = data?.translations as Record<string, { title: string, message: string }> | undefined
            const localized = translations?.[locale.value]
              ?? translations?.en
              ?? translations?.el
              ?? { title: '', message: '' }

            const presentation = presentationFor(data.kind as string, data.category as string)

            toast.add({
              title: localized.title,
              description: localized.message,
              color: presentation.color,
              icon: presentation.icon,
            })
            if (isBroadcastChannelSupported.value) {
              post(data)
            }
            if (isWebNotificationSupported.value) {
              await show({
                title: localized.title,
                body: localized.message,
                // ``notification_type`` (e.g. ``order_shipped``) is a
                // stable, shared-across-users tag so the OS-level
                // replacement behavior actually collapses duplicates.
                // Falls back to ``data.type`` (the channel-layer event
                // name) for notifications without an explicit subtype.
                tag: (data.notification_type || data.type) as string | undefined,
              })
            }
          },
        })
      }
      catch (error) {
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode === 401 || statusCode === 403) {
          await useUserSession().clear()
        }
        log.error({ action: 'ws:init', error })
      }
    }

    // Cross-tab logout: when another tab logs out, close the WS here too.
    // Also post a logout signal when this tab's loggedIn flips to false.
    if (isBroadcastChannelSupported.value) {
      watch(broadcastData, async (msg) => {
        if (msg?.type === 'logout') {
          closeWebSocket()
          await useUserSession().clear()
        }
      })
    }

    watch(
      () => loggedIn.value,
      (isLoggedIn, previous) => {
        if (!previous && isLoggedIn) {
          reconnectAttempt = 0
          initializeWebSocket()
        }
        else if (previous && !isLoggedIn) {
          closeWebSocket()
          if (isBroadcastChannelSupported.value) {
            post({ type: 'logout' })
          }
        }
      },
      { immediate: true },
    )

    return {
      provide: {
        websocket: () => ws,
      },
    }
  },
})
