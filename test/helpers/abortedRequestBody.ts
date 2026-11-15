import http from 'node:http'
import net from 'node:net'
import { createEvent, toWebRequest } from 'h3'

/**
 * Close `client` once `server` has begun reading a request's body: from the
 * request's first `data` event, so the read is under way and no timer
 * guesses when it is.
 */
export function closeClientMidBody(server: http.Server, client: () => net.Socket | undefined): void {
  server.on('request', (req: http.IncomingMessage) => {
    req.once('data', () => client()?.destroy())
  })
}

/**
 * The error a route's body read really gets when its client closes the
 * connection mid-body: a local server reads the request the way a route
 * does (h3's `toWebRequest`, the `event.req` a `nuxt/server` route gets,
 * read with `.text()` as `readBody` does), and a socket sends the headers
 * and part of the body, then closes once the server is reading it. Node's
 * own error, not a stand-in.
 */
export async function abortedRequestBodyError(): Promise<unknown> {
  return new Promise((resolve) => {
    let socket: net.Socket | undefined
    const server = http.createServer(async (req, res) => {
      const outcome = await toWebRequest(createEvent(req, res)).text().then(() => undefined, (error: unknown) => error)
      server.close()
      resolve(outcome)
    })
    closeClientMidBody(server, () => socket)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      socket = net.connect(port, '127.0.0.1', () => {
        socket?.write('POST /api/builder/presence HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{"documents":')
      })
      socket.on('error', () => undefined)
    })
  })
}
