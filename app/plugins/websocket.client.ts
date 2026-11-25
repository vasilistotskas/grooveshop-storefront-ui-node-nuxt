import { withQuery } from 'ufo'
import type { UseWebNotificationOptions } from '@vueuse/core'
import type { Composer } from 'vue-i18n'

/**
 * The socket's heartbeat, a contract with Django's `NotificationConsumer`
 * (`src/notification/consumers.py`), which answers HEARTBEAT_PING with
 * HEARTBEAT_PONG. An answer keeps the socket open. No answer within
 * HEARTBEAT_PONG_TIMEOUT_MS closes it and a new one opens, which is how a
 * connection a proxy dropped without a word is found.
 */
const HEARTBEAT_PING = 'ping'
const HEARTBEAT_PONG = 'pong'
const HEARTBEAT_INTERVAL_MS = 30000
const HEARTBEAT_PONG_TIMEOUT_MS = 5000

/**
 * Every attempt that fails, whether its socket drops or its ticket cannot be
 * fetched, schedules the next after a back-off from RECONNECT_BASE_DELAY_MS,
 * doubling up to RECONNECT_MAX_DELAY_MS. Only a 401 or 403 on the ticket
 * stops it: the session is gone. The back-off starts over only after a socket
 * the server answered STABLE_ANSWERED_HEARTBEATS times, about a minute of
 * proven life, however late the browser reports the close. Starting over on
 * every open let a socket that opens and is then closed reconnect after one
 * second forever, each cycle a ticket, a handshake and its log lines
 * (storefront #414).
 */
const RECONNECT_BASE_DELAY_MS = 1000
const RECONNECT_MAX_DELAY_MS = 30000
const STABLE_ANSWERED_HEARTBEATS = 2

export default defineNuxtPlugin({
  name: 'websocket',
  parallel: true,
  async setup(nuxtApp) {
    const config = useRuntimeConfig()
    const locale = (nuxtApp.$i18n as Composer).locale
    const toast = useToast()
    const { loggedIn, fetch: fetchSession } = useUserSession()
    const tenantStore = useTenantStore()
    const userNotificationStore = useUserNotificationStore()
    const { setupNotifications } = userNotificationStore
    const debouncedSetupNotifications = useDebounceFn(setupNotifications, 1000)
    const { presentationFor } = useNotificationPresentation()

    // BroadcastChannel for cross-tab coordination (notifications, sign-in and logout).
    // D = incoming data type, P = outgoing post type (both are plain objects).
    const { isSupported: isBroadcastChannelSupported, post, data: broadcastData } = useBroadcastChannel<Record<string, unknown>, Record<string, unknown>>({ name: 'notifications' })

    // Set while this tab takes a sign-in another tab posted, so the sign-in is
    // not posted back.
    let adoptingOtherTabSignIn = false
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectAttempt = 0
    let ws: ReturnType<typeof useWebSocket> | null = null
    // Moved by every close and every new attempt. An attempt whose number
    // moved is over: its ticket arriving after a sign-out opens nothing, and
    // the close event of a socket closed on purpose schedules nothing.
    let attemptNumber = 0

    function closeWebSocket() {
      attemptNumber++
      if (ws) {
        // A reconnect finds its dropped socket closed already: only closing
        // a live one is news.
        if (ws.status.value !== 'CLOSED') log.info('ws', 'Closed')
        ws.close()
        ws = null
      }
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
    }

    /** Schedule the next attempt; returns its number and delay for the caller's one log line. */
    function scheduleReconnect() {
      const delayMs = Math.min(RECONNECT_BASE_DELAY_MS * 2 ** reconnectAttempt, RECONNECT_MAX_DELAY_MS)
      reconnectAttempt++
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        if (loggedIn.value) {
          initializeWebSocket()
        }
      }, delayMs)
      return { attempt: reconnectAttempt, delayMs }
    }

    async function initializeWebSocket() {
      closeWebSocket()
      const attempt = attemptNumber
      const isCurrent = () => attempt === attemptNumber && loggedIn.value
      if (!loggedIn.value) {
        log.warn('ws', 'User not logged in, skipping websocket initialization.')
        return
      }

      try {
        // Single-use 60s ticket — see server/api/websocket/user/ticket.get.ts,
        // which validates the answer, so a ticket is always there. Never put
        // the Knox access token in the URL; it is logged by every proxy layer
        // and lives for 7 days.
        const response = await $api<{ ticket: string, expiresIn: number }>('/api/websocket/user/ticket', {
          method: 'GET',
        })
        if (!isCurrent()) return

        const websocketProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws'
        const djangoApiHostName = tenantStore.apiDomain || config.public.djangoHostName
        if (!djangoApiHostName) {
          log.warn('ws', 'NUXT_PUBLIC_DJANGO_HOST_NAME is not configured — WebSocket initialization aborted')
          return
        }
        const wsEndpoint = withQuery(`${websocketProtocol}://${djangoApiHostName}/ws/notifications/`, {
          ticket: response.ticket,
        })

        // Icon: tenant favicon, platform logo ONLY on the platform
        // tenant, otherwise browser default — never another store's
        // brand on a tenant's OS notifications.
        const isPlatformTenant = useIsPlatformTenant()
        const notificationIcon
          = tenantStore.faviconUrl
            || (isPlatformTenant.value ? '/platform-favicon/logo.svg' : undefined)
        const notificationOptions: UseWebNotificationOptions = {
          dir: 'auto',
          lang: locale.value,
          icon: notificationIcon,
          renotify: true,
          requireInteraction: false,
          vibrate: [200, 100, 200],
        }

        const { isSupported: isWebNotificationSupported, show } = useWebNotification(notificationOptions)

        // Pongs this socket got: proof it lived, counted apart from when
        // the browser gets round to reporting its close.
        let answeredHeartbeats = 0
        ws = useWebSocket(wsEndpoint, {
          // Ticket is single-use and consumed on connect — autoReconnect
          // would reuse the same (dead) URL. Instead we handle reconnection
          // manually via onDisconnected so each attempt fetches a fresh ticket.
          autoReconnect: false,
          heartbeat: {
            message: HEARTBEAT_PING,
            // VueUse keeps this answer from `onMessage`, which reads JSON
            // notifications only.
            responseMessage: HEARTBEAT_PONG,
            scheduler: ping => useIntervalFn(ping, HEARTBEAT_INTERVAL_MS, { immediate: false }),
            pongTimeout: HEARTBEAT_PONG_TIMEOUT_MS,
          },
          onConnected: (wsConn) => {
            wsConn.addEventListener('message', (event) => {
              if (event.data === HEARTBEAT_PONG) answeredHeartbeats++
            })
            log.info('ws', 'Connected')
          },
          // One log line per drop: every line is a POST to the rate-limited
          // `/api/_evlog/ingest`, and a socket that keeps failing must not
          // spend a tab's budget. The `error` event a failed socket fires
          // first is not logged: browsers give it no detail, and the close
          // that always follows carries the code.
          onDisconnected: (_wsConn, event) => {
            if (attempt !== attemptNumber) return
            if (answeredHeartbeats >= STABLE_ANSWERED_HEARTBEATS) {
              reconnectAttempt = 0
            }
            const drop = { tag: 'ws', message: 'Disconnected', code: event?.code, reason: event?.reason }
            if (!loggedIn.value) {
              log.info(drop)
              return
            }
            log.info({ ...drop, ...scheduleReconnect() })
          },
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

            // BoxNow parcel-state notifications carry semantic icons that are
            // more specific than the generic SHIPPING category icon.
            // `data.type` is the Django notification channel-layer event name.
            const BOXNOW_ICON_OVERRIDES: Record<string, string> = {
              BOXNOW_PARCEL_AT_LOCKER: 'i-lucide-package-check',
              BOXNOW_PARCEL_DELIVERED: 'i-lucide-check-circle',
            }
            const notificationType = data.type as string | undefined
            const resolvedIcon = (notificationType && BOXNOW_ICON_OVERRIDES[notificationType]) || presentation.icon

            toast.add({
              title: localized.title,
              description: localized.message,
              color: presentation.color,
              icon: resolvedIcon,
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
        if (!isCurrent()) return
        const statusCode = (error as { statusCode?: number })?.statusCode
        if (statusCode === 401 || statusCode === 403) {
          // Route through the canonical auth:change pipeline so Pinia stores
          // clear, navigation happens, and the user sees the session-expired
          // toast. Bare useUserSession().clear() would leave the UI half-stale.
          await callAuthChangeHook(SYNTHETIC_EXPIRED_SESSION)
          log.error({ action: 'ws:init', error })
          return
        }
        // Anything else (the network down after a laptop wakes, a 5xx, the
        // server restarting) is tried again: no socket means no close event
        // to schedule the next attempt.
        log.error({ action: 'ws:init', error, ...scheduleReconnect() })
      }
    }

    // Cross-tab logout: when another tab logs out, close the WS here too.
    // Cross-tab sign-in: when another tab signs in, a tab that is signed out
    // asks the session again; the cookie is shared, so it is the new
    // shopper's, and `setup.ts` restores the account on the `loggedIn` flip.
    // Without it a tab acted signed out until it was reloaded (#461).
    // This tab posts each when its own loggedIn flips.
    if (isBroadcastChannelSupported.value) {
      watch(broadcastData, async (msg) => {
        if (msg?.type === 'login' && !loggedIn.value) {
          adoptingOtherTabSignIn = true
          try {
            await fetchSession()
          }
          finally {
            adoptingOtherTabSignIn = false
          }
        }
        else if (msg?.type === 'logout') {
          closeWebSocket()
          // Same as the WS-ticket 401 case — go through auth:change so the
          // other tab's logout fully tears down state here. Setting
          // explicit:false surfaces the session-expired toast, which is
          // the right UX for a background-tab logout the user didn't
          // initiate in this tab.
          await callAuthChangeHook(SYNTHETIC_EXPIRED_SESSION, { explicit: false })
        }
      })
    }

    watch(
      () => loggedIn.value,
      (isLoggedIn, previous) => {
        if (!previous && isLoggedIn) {
          reconnectAttempt = 0
          initializeWebSocket()
          // A sign-in in this tab, not the session it opened with
          // (`previous` is undefined on the first run).
          if (previous === false && !adoptingOtherTabSignIn && isBroadcastChannelSupported.value) {
            post({ type: 'login' })
          }
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
