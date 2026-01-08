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
export default defineNitroPlugin(() => {
  // Create undici Agent with connection pooling and keep-alive
  const agent = new Agent({
    keepAliveTimeout: 30000, // 30 seconds keep-alive
    keepAliveMaxTimeout: 60000, // Max 60 seconds
    connections: 100, // Max concurrent connections per origin
    pipelining: 10, // Pipeline up to 10 requests per connection
    connect: {
      timeout: 10000, // 10 second connection timeout
      rejectUnauthorized: true, // Verify SSL in production
    },
  })

  // Set as global dispatcher for all $fetch calls
  setGlobalDispatcher(agent)

  console.log('[Nitro HTTP Agent] ✅ Connection pooling enabled with undici Agent')
  console.log('[Nitro HTTP Agent] - keepAliveTimeout: 30s')
  console.log('[Nitro HTTP Agent] - connections: 100')
  console.log('[Nitro HTTP Agent] - pipelining: 10')
})
