import http from 'node:http'
import net from 'node:net'
import { createEvent, toWebRequest } from 'h3'

/**
 * The error a route's body read really gets when its client closes the
 * connection mid-body: a local server reads the request the way a route
 * does (h3's `toWebRequest`, the `event.req` a `nuxt/server` route gets,
 * read with `.text()` as `readBody` does), and a socket sends the headers
 * and half the body, then closes. Node's own error, not a stand-in.
 */
export async function abortedRequestBodyError(): Promise<unknown> {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      const request = toWebRequest(createEvent(req, res))
      const outcome = await request.text().then(() => undefined, (error: unknown) => error)
      server.close()
      resolve(outcome)
    })
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : 0
      const socket = net.connect(port, '127.0.0.1', () => {
        socket.write('POST /api/builder/presence HTTP/1.1\r\nHost: localhost\r\nContent-Type: application/json\r\nContent-Length: 1000\r\n\r\n{"documents":')
        setTimeout(() => socket.destroy(), 50)
      })
    })
  })
}
