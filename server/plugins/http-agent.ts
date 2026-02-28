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
