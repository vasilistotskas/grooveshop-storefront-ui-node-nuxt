import http from 'node:http'
import net from 'node:net'
import type { EventHandler, H3Error } from 'h3'
import { createApp, defineEventHandler, toNodeListener, toWebRequest } from 'h3'
import { describe, expect, it } from 'vitest'
import plugin from '~~/server/early-plugins/client-abort-status'
import { runNitroPlugin } from '~~/test/helpers/nitro'

/** What the wide event logged and what the error handler answered. */
interface Outcome { logged: number, answered: number }

/**
 * A request through a real h3 app wired the way Nitro's `app.mjs` wires it:
 * h3 wraps the route's throw, `onError` fires the `error` hooks at once
 * (`callHookParallel`) and then hands the same error to the error handler,
 * which answers with its status. A hook registered after the plugin reads
 * the status synchronously, as evlog's own `error` hook does for the wide
 * event. The client sends the headers and `sent` of the body; it closes the
 * socket mid-body unless `sent` is the whole body.
 */
async function requestThrough(route: EventHandler, sent: string, contentLength: number): Promise<Outcome> {
  const nitroApp = await runNitroPlugin(plugin)
  let logged = 0
  nitroApp.hooks.hook('error', (error: H3Error) => {
    logged = error.statusCode
  })

  return new Promise((resolve) => {
    const app = createApp({
      onError: (error, event) => {
        void nitroApp.hooks.callHookParallel('error', error, { event, tags: ['request'] })
        server.close()
        resolve({ logged, answered: error.statusCode })
      },
    })
    app.use('/api/analytics/cookie-consent', route)
    const server = http.createServer(toNodeListener(app))
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.write(`POST /api/analytics/cookie-consent HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: ${contentLength}\r\n\r\n${sent}`)
        if (sent.length < contentLength) setTimeout(() => socket.destroy(), 50)
      })
      socket.on('data', () => socket.destroy())
      socket.on('error', () => undefined)
    })
  })
}

/** A route that maps no error: it reads the body the way `readBody` does. */
const readsTheBody = defineEventHandler(async (event) => {
  await toWebRequest(event).text()
  return null
})

describe('server/early-plugins/client-abort-status', () => {
  it('answers and logs 499 for a request its client closed mid-body, in a route without handleError', async () => {
    expect(await requestThrough(readsTheBody, '{"event":"bann', 1000)).toEqual({ logged: 499, answered: 499 })
  })

  it('keeps a genuine failure of the same route a 500', async () => {
    const fails = defineEventHandler(async (event) => {
      await toWebRequest(event).text()
      throw new Error('boom')
    })

    expect(await requestThrough(fails, '{}', 2)).toEqual({ logged: 500, answered: 500 })
  })
})
