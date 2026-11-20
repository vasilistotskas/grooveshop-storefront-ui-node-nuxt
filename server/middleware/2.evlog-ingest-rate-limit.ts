import { defineEventHandler, getRequestURL } from 'nuxt/server'

/**
 * Per-IP rate limit on evlog's client-log ingest route.
 *
 * `/api/_evlog/ingest` belongs to evlog (`transport.enabled` in
 * `nuxt.config.ts` mounts it) and is unauthenticated by design: its origin
 * check only blocks cross-site browsers, any script can satisfy it. Since
 * evlog prints what it accepts on stdout, and so into VictoriaLogs, an
 * unthrottled route would let anyone flood the log store. The route is evlog's, so the limit sits in front of it.
 *
 * The browser sends one event per POST (no batching), and logs only
 * deliberately: warnings, errors and one line per notifications-socket
 * connect and drop (`app/plugins/websocket.client.ts`, whose reconnects back
 * off). 60 a minute per IP and store is well above a shopper's pace; past it
 * the 429 only costs the client its own log lines: evlog's browser transport
 * sends each event once and never retries, whatever the answer.
 */
const INGEST_PATH = '/api/_evlog/ingest'
const RATE_LIMIT = { name: 'evlog-ingest', windowSeconds: 60, maxRequests: 60 }

export default defineEventHandler(async (event) => {
  if (event.req.method !== 'POST' || getRequestURL(event).pathname !== INGEST_PATH) return
  await enforceRateLimit(event, RATE_LIMIT)
})
