import { Agent, setGlobalDispatcher } from 'undici'

/**
 * HTTP Agent plugin for connection pooling and keep-alive.
 *
 * This significantly reduces latency for internal API calls by:
 * 1. Reusing TCP connections (keep-alive)
 * 2. Connection pooling (connections)
 * 3. Pipelining requests (pipelining)
 *
 * Without this, each $fetch call creates a new TCP connection,
 * adding ~50-100ms latency per request in production.
 */
export default defineNitroPlugin((nitroApp) => {
  // Create undici Agent with connection pooling and keep-alive
  const agent = new Agent({
    keepAliveTimeout: 30000, // 30 seconds keep-alive
    keepAliveMaxTimeout: 60000, // Max 60 seconds
    connections: 100, // Max concurrent connections per origin
    pipelining: 1, // Sequential requests per connection (safer default)
    // Undici defaults both response timeouts to 300s, which let a
    // stalled Django upstream pin an SSR render far past the edge
    // (Traefik) timeout — the user saw a dead document, we saw
    // nothing. 15s to first header byte / 30s of body inactivity
    // bound every server-side $fetch centrally, so an upstream blip
    // degrades the page (guarded fetch chains, 503 on the document)
    // instead of hanging it. Prod audit 2026-07-02: backend readiness
    // gaps under CPU load are the trigger.
    headersTimeout: 15000,
    bodyTimeout: 30000,
    connect: {
      timeout: 10000, // 10 second connection timeout
      rejectUnauthorized: true, // Verify SSL in production
    },
  })

  // Set as global dispatcher for all $fetch calls
  setGlobalDispatcher(agent)

  // Close the agent when Nitro shuts down (including after prerender) so open
  // keep-alive sockets don't prevent the build process from exiting.
  nitroApp.hooks.hookOnce('close', () => agent.close())

  log.info('http-agent', 'Connection pooling enabled', { keepAlive: 30, connections: 100, pipelining: 1 })
})
