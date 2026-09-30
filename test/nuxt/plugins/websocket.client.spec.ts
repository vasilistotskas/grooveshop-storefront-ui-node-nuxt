import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import websocketPlugin from '~/plugins/websocket.client'
import { setTenant } from '~~/test/helpers/tenant'

/**
 * The notifications socket. It authenticates with a single-use ticket
 * (never the Knox token in the URL), so every connection — the first
 * and each reconnect — fetches a fresh one, and reconnects back off
 * exponentially up to 30s. A ticket refused with 401/403 means the
 * session is gone, which goes through the canonical `auth:change`
 * pipeline rather than a bare session clear.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

interface SocketOptions {
  onConnected: () => void
  onDisconnected: (ws: unknown, event?: { reason?: string }) => void
  autoReconnect: boolean
}

const { session, sockets, callAuthChangeHookMock } = vi.hoisted(() => ({
  session: { loggedIn: undefined as undefined | Ref<boolean> },
  sockets: [] as Array<{ url: string, options: SocketOptions, close: ReturnType<typeof vi.fn> }>,
  callAuthChangeHookMock: vi.fn(() => Promise.resolve()),
}))

mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  return {
    loggedIn: session.loggedIn,
    user: ref(null),
    session: ref({}),
    ready: ref(true),
    fetch: vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  }
})
mockNuxtImport('useWebSocket', () => (url: string, options: SocketOptions) => {
  const socket = { url, options, close: vi.fn() }
  sockets.push(socket)
  return socket
})
mockNuxtImport('useWebNotification', () => () => ({ isSupported: ref(false), show: vi.fn() }))
mockNuxtImport('useBroadcastChannel', () => () => ({ isSupported: ref(false), post: vi.fn(), data: ref(null) }))
mockNuxtImport('callAuthChangeHook', () => callAuthChangeHookMock)

const TICKET = '/api/websocket/user/ticket'
let tickets = 0

async function install() {
  await (websocketPlugin as unknown as (app: unknown) => Promise<unknown>)({ $i18n: { locale: ref('el') } })
  await flushPromises()
}

/** Drop the current socket and let `ms` pass. */
async function disconnectAndWait(ms: number) {
  sockets.at(-1)!.options.onDisconnected(null, { reason: 'network' })
  await vi.advanceTimersByTimeAsync(ms)
}

describe('websocket plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    setTenant({ apiDomain: 'api.test.local' })
    session.loggedIn = ref(true)
    sockets.length = 0
    tickets = 0
    api.routes({ [TICKET]: () => ({ ticket: `t${++tickets}`, expiresIn: 60 }) })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('connects with a fresh ticket, not a token, and leaves reconnecting to the plugin', async () => {
    await install()

    expect(api.callsTo(TICKET)).toHaveLength(1)
    expect(sockets).toHaveLength(1)
    expect(sockets[0]!.url).toBe('ws://api.test.local/ws/notifications/?ticket=t1')
    // A reused URL would carry an already-consumed ticket.
    expect(sockets[0]!.options.autoReconnect).toBe(false)
  })

  it('does not connect a guest', async () => {
    session.loggedIn = ref(false)

    await install()

    expect(api.callsTo(TICKET)).toEqual([])
    expect(sockets).toEqual([])
  })

  it('connects once the visitor signs in', async () => {
    session.loggedIn = ref(false)
    await install()

    session.loggedIn.value = true
    await nextTick()
    await flushPromises()

    expect(sockets).toHaveLength(1)
  })

  it('backs off 1s, 2s, 4s … up to 30s, with a new ticket for every attempt', async () => {
    await install()

    for (const [attempt, delay] of [1000, 2000, 4000, 8000, 16000, 30000, 30000].entries()) {
      sockets.at(-1)!.options.onDisconnected(null)
      await vi.advanceTimersByTimeAsync(delay - 1)
      expect(sockets, `attempt ${attempt + 1} came early`).toHaveLength(attempt + 1)
      await vi.advanceTimersByTimeAsync(1)
      expect(sockets, `attempt ${attempt + 1} did not come after ${delay}ms`).toHaveLength(attempt + 2)
    }
    expect(sockets.at(-1)!.url).toContain(`ticket=t${sockets.length}`)
  })

  it('starts the back-off over once a connection succeeds', async () => {
    await install()
    await disconnectAndWait(1000)
    await disconnectAndWait(2000)
    expect(sockets).toHaveLength(3)

    sockets.at(-1)!.options.onConnected()
    await disconnectAndWait(1000)

    expect(sockets).toHaveLength(4)
  })

  it('closes the socket and stops reconnecting on sign-out', async () => {
    await install()
    sockets[0]!.options.onDisconnected(null)

    session.loggedIn!.value = false
    await nextTick()
    await vi.advanceTimersByTimeAsync(60000)

    expect(sockets).toHaveLength(1)
    expect(sockets[0]!.close).toHaveBeenCalled()
  })

  it.each([[401], [403]])('treats a ticket refused with %s as an expired session', async (statusCode) => {
    api.routes({ [TICKET]: () => { throw Object.assign(new Error('refused'), { statusCode }) } })

    await install()

    expect(sockets).toEqual([])
    expect(callAuthChangeHookMock).toHaveBeenCalledWith(expect.objectContaining({ status: 410 }))
  })

  it('leaves the session alone when the ticket endpoint merely fails', async () => {
    api.routes({ [TICKET]: () => { throw Object.assign(new Error('Bad Gateway'), { statusCode: 502 }) } })

    await install()

    expect(sockets).toEqual([])
    expect(callAuthChangeHookMock).not.toHaveBeenCalled()
  })

  it('does not connect without a ticket', async () => {
    api.routes({ [TICKET]: {} })

    await install()

    expect(sockets).toEqual([])
  })
})
