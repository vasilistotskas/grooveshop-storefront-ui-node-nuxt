import type { RedisClientType } from 'redis'
import { createClient } from 'redis'
import * as z from 'zod'

/**
 * SSE stream of payment-status updates for a single order.
 *
 * Why not poll: the previous client-side pollPaymentStatus burned up to
 * 10 HTTP round-trips waiting for a webhook that usually fires in
 * under a second. This endpoint subscribes to Redis channel
 * `payment:status:{order_id}` which Django publishes to on every
 * webhook-driven status transition, and pushes the update to the
 * browser with near-zero latency.
 *
 * Permission: mirrors /api/orders/[id]/payment-status — the initial
 * fetch below goes through Django's IsOwnerOrAdminOrGuest, so if the
 * caller can't read the order, the stream never opens.
 *
 * Lifecycle: the stream auto-closes when status reaches a terminal
 * state (COMPLETED / FAILED / CANCELED) or when the browser
 * disconnects, whichever comes first.
 */

const PAYMENT_STATUS_CHANNEL_PREFIX = 'payment:status:'
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'CANCELED'])

const zPathParams = z.object({
  id: z.union([z.string().regex(/^-?\d+$/), z.coerce.number().int()]),
})
const zGuestQuery = z.object({
  uuid: z.string().uuid().optional(),
})

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(event, zPathParams.parse)
  const query = await getValidatedQuery(event, zGuestQuery.parse)
  const orderId = String(params.id)

  // Fetch current state first. This also doubles as the authorization
  // gate — if Django returns 403/404, we throw here and never open the
  // SSE connection. The response also primes the client with the
  // current status so the UI doesn't wait for the next transition.
  const accessToken = await getAllAuthAccessToken(event)
  const statusUrl = new URL(`${config.apiBaseUrl}/order/${orderId}/payment_status/`)
  if (query.uuid) statusUrl.searchParams.set('uuid', query.uuid)

  let initialStatus: Record<string, unknown>
  try {
    initialStatus = await $fetch(statusUrl.toString(), {
      method: 'GET',
      headers: createHeaders(null, accessToken),
    })
  }
  catch (error) {
    await handleError(error)
    return
  }

  setResponseHeader(event, 'X-Accel-Buffering', 'no')
  setResponseHeader(event, 'Cache-Control', 'no-store')

  const eventStream = createEventStream(event)

  const subscriber: RedisClientType = createClient({
    socket: {
      host: config.redis?.host as string | undefined,
      port: Number(config.redis?.port ?? 6379),
    },
    password: (config.redis?.password as string | undefined) || undefined,
  })

  const channel = `${PAYMENT_STATUS_CHANNEL_PREFIX}${orderId}`

  let closed = false
  const cleanup = async () => {
    if (closed) return
    closed = true
    try {
      await subscriber.unsubscribe(channel)
    }
    catch { /* ignore */ }
    await subscriber.quit().catch(() => {})
  }

  subscriber.on('error', (err) => {
    log.error({ action: 'sse:payment-status:redis-error', orderId, error: err })
  })

  try {
    await subscriber.connect()

    try {
      await subscriber.subscribe(channel, async (message) => {
        if (closed) return
        try {
          await eventStream.push({ event: 'payment-status', data: message })
          const parsed = JSON.parse(message) as { status?: string, paymentStatus?: string }
          if (parsed.paymentStatus && TERMINAL_STATUSES.has(parsed.paymentStatus)) {
            await eventStream.close()
            await cleanup()
          }
        }
        catch (err) {
          log.error({ action: 'sse:payment-status:push-error', orderId, error: err })
        }
      })
    }
    catch (err) {
      // subscribe() itself failed — quit the client before propagating.
      log.error({ action: 'sse:payment-status:subscribe-failed', orderId, error: err })
      await cleanup()
      try {
        await eventStream.close()
      }
      catch { /* ignore */ }
      return eventStream.send()
    }

    // Register cleanup on graceful browser disconnect only after subscribe
    // succeeds, so the subscriber is always in a subscribable state when
    // onClosed fires.
    eventStream.onClosed(async () => {
      await cleanup()
    })

    // Prime the client with the current state. If the order is already
    // terminal, close immediately — no point holding a Redis subscriber
    // open for a never-changing value.
    await eventStream.push({
      event: 'payment-status',
      data: JSON.stringify({
        orderId: Number(orderId),
        status: initialStatus.status,
        paymentStatus: initialStatus.paymentStatus,
        paymentId: initialStatus.paymentId,
      }),
    })
    if (typeof initialStatus.paymentStatus === 'string' && TERMINAL_STATUSES.has(initialStatus.paymentStatus)) {
      await eventStream.close()
      await cleanup()
    }

    return eventStream.send()
  }
  catch (err) {
    // connect() failed — subscriber never entered pub/sub mode; quit cleans up the TCP socket.
    log.error({ action: 'sse:payment-status:connect-failed', orderId, error: err })
    await cleanup()
    throw err
  }
})
