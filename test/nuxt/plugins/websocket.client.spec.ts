import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import { effectScope, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import type { UseWebSocketOptions } from '@vueuse/core'
import websocketPlugin from '~/plugins/websocket.client'
import { setTenant } from '~~/test/helpers/tenant'
import { failWith } from '~~/test/helpers/api'

/**
 * The notifications socket. It authenticates with a single-use ticket
 * (never the Knox token in the URL), so every connection — the first
 * and each reconnect — fetches a fresh one, and reconnects back off
 * exponentially up to 30s, starting over only after a socket the server
 * answered twice. A ticket that cannot be fetched is tried again on the same
 * back-off; a ticket refused with 401/403 means the
 * session is gone, which goes through the canonical `auth:change`
 * pipeline rather than a bare session clear.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

/** The browser socket VueUse hands `onConnected`, which the plugin listens to for pongs. */
interface Conn {
  addEventListener: (type: 'message', listener: (event: { data: string }) => void) => void
}

interface SocketOptions {
  onConnected: (ws: Conn) => void
  onDisconnected: (ws: unknown, event?: { code?: number, reason?: string }) => void
  onError?: () => void
  autoReconnect: boolean
}

const { session, channel, sockets, callAuthChangeHookMock, mockLog } = vi.hoisted(() => ({
  session: { loggedIn: undefined as undefined | Ref<boolean>, fetch: undefined as undefined | (() => Promise<void>) },
  /** The tabs' `notifications` BroadcastChannel: unsupported unless a test turns it on. */
  channel: { supported: false, post: undefined as undefined | ((message: Record<string, unknown>) => void), data: undefined as undefined | Ref<Record<string, unknown> | null> },
  sockets: [] as Array<{ url: string, options: SocketOptions, close: ReturnType<typeof vi.fn>, status: Ref<string> }>,
  callAuthChangeHookMock: vi.fn(() => Promise.resolve()),
  mockLog: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))
mockNuxtImport('log', () => mockLog)

mockNuxtImport('useUserSession', () => () => {
  session.loggedIn ??= ref(false)
  return {
    loggedIn: session.loggedIn,
    user: ref(null),
    session: ref({}),
    ready: ref(true),
    fetch: session.fetch ?? vi.fn(() => Promise.resolve()),
    clear: vi.fn(() => Promise.resolve()),
  }
})
mockNuxtImport('useWebSocket', () => (url: string, options: SocketOptions) => {
  const socket = { url, options, close: vi.fn(), status: ref('OPEN') }
  sockets.push(socket)
  return socket
})
mockNuxtImport('useWebNotification', () => () => ({ isSupported: ref(false), show: vi.fn() }))
mockNuxtImport('useBroadcastChannel', () => () => ({
  isSupported: ref(channel.supported),
  post: channel.post ?? vi.fn(),
  data: channel.data ?? ref(null),
}))
mockNuxtImport('callAuthChangeHook', () => callAuthChangeHookMock)

const TICKET = '/api/websocket/user/ticket'
let tickets = 0

async function install() {
  await (websocketPlugin as unknown as (app: unknown) => Promise<unknown>)({ $i18n: { locale: ref('el') } })
  await flushPromises()
}

/** Open the current socket; `answer` sends that many pongs on it. */
function connect(answers = 0) {
  const listeners: Array<(event: { data: string }) => void> = []
  sockets.at(-1)!.options.onConnected({ addEventListener: (_type, listener) => listeners.push(listener) })
  for (let pong = 0; pong < answers; pong++) listeners.forEach(listener => listener({ data: 'pong' }))
}

/** A ticket request that answers when the test says. */
function heldTicket() {
  let release!: () => void
  const answered = new Promise<{ ticket: string, expiresIn: number }>((resolve) => {
    release = () => resolve({ ticket: `t${++tickets}`, expiresIn: 60 })
  })
  api.routes({ [TICKET]: () => answered })
  return () => release()
}

/** Drop the current socket, as the browser does (closed first), and let `ms` pass. */
async function disconnectAndWait(ms: number) {
  const socket = sockets.at(-1)!
  socket.status.value = 'CLOSED'
  socket.options.onDisconnected(null, { code: 1006, reason: '' })
  await vi.advanceTimersByTimeAsync(ms)
}

describe('websocket plugin', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
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

  it('starts the back-off over after a socket the server answered twice', async () => {
    await install()
    await disconnectAndWait(1000)
    await disconnectAndWait(2000)
    expect(sockets).toHaveLength(3)

    connect(2)
    await disconnectAndWait(1000)

    expect(sockets).toHaveLength(4)
  })

  it('keeps backing off after a socket the server answered once, however long its close took to arrive', async () => {
    await install()
    await disconnectAndWait(1000)

    connect(1)
    await vi.advanceTimersByTimeAsync(61000)
    await disconnectAndWait(1999)
    expect(sockets).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)
    expect(sockets).toHaveLength(3)
  })

  it('keeps backing off while connections open and are closed again at once', async () => {
    await install()

    for (const [attempt, delay] of [1000, 2000, 4000, 8000].entries()) {
      connect()
      await disconnectAndWait(delay - 1)
      expect(sockets, `attempt ${attempt + 1} came early`).toHaveLength(attempt + 1)
      await vi.advanceTimersByTimeAsync(1)
      expect(sockets).toHaveLength(attempt + 2)
    }
  })

  it('logs one line per drop, with its close code, and nothing for the socket error before it', async () => {
    await install()
    expect(sockets[0]!.options.onError).toBeUndefined()

    await disconnectAndWait(1000)
    await disconnectAndWait(2000)
    await disconnectAndWait(4000)

    expect(mockLog.info.mock.calls).toEqual([
      [{ tag: 'ws', message: 'Disconnected', code: 1006, reason: '', attempt: 1, delayMs: 1000 }],
      [{ tag: 'ws', message: 'Disconnected', code: 1006, reason: '', attempt: 2, delayMs: 2000 }],
      [{ tag: 'ws', message: 'Disconnected', code: 1006, reason: '', attempt: 3, delayMs: 4000 }],
    ])
    expect(mockLog.error).not.toHaveBeenCalled()
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

  it('logs one line for a sign-out, and nothing when its socket reports the close', async () => {
    await install()

    session.loggedIn!.value = false
    await nextTick()
    sockets[0]!.options.onDisconnected(null, { code: 1000, reason: '' })

    expect(sockets[0]!.close).toHaveBeenCalled()
    expect(mockLog.info.mock.calls).toEqual([['ws', 'Closed']])
  })

  it('leaves the new socket alone when the one closed at sign-out reports its close late', async () => {
    await install()
    session.loggedIn!.value = false
    await nextTick()
    session.loggedIn!.value = true
    await nextTick()
    await flushPromises()
    expect(sockets).toHaveLength(2)

    sockets[0]!.options.onDisconnected(null, { code: 1000, reason: '' })
    await vi.advanceTimersByTimeAsync(60000)

    expect(sockets).toHaveLength(2)
    expect(sockets[1]!.close).not.toHaveBeenCalled()
  })

  it('opens no socket when the shopper signs out while the ticket is on its way', async () => {
    await install()
    const release = heldTicket()
    await disconnectAndWait(1000)
    expect(api.callsTo(TICKET)).toHaveLength(2)

    session.loggedIn!.value = false
    await nextTick()
    release()
    await flushPromises()

    expect(sockets).toHaveLength(1)
  })

  it('opens only the newest socket when the shopper signs out and in again while a ticket is on its way', async () => {
    const releases: Array<() => void> = []
    api.routes({
      [TICKET]: () => new Promise((resolve) => {
        const ticket = `t${releases.length + 1}`
        releases.push(() => resolve({ ticket, expiresIn: 60 }))
      }),
    })
    await install()

    session.loggedIn!.value = false
    await nextTick()
    session.loggedIn!.value = true
    await nextTick()
    expect(releases).toHaveLength(2)
    releases[0]!()
    releases[1]!()
    await flushPromises()

    expect(sockets.map(socket => socket.url)).toEqual(['ws://api.test.local/ws/notifications/?ticket=t2'])
  })

  it.each([[401], [403]])('treats a ticket refused with %s as an expired session, and stops', async (statusCode) => {
    api.routes({ [TICKET]: failWith(statusCode) })

    await install()
    await vi.advanceTimersByTimeAsync(60000)

    expect(sockets).toEqual([])
    expect(api.callsTo(TICKET)).toHaveLength(1)
    expect(callAuthChangeHookMock).toHaveBeenCalledWith(expect.objectContaining({ status: 410 }))
  })

  it('leaves the session alone when the ticket endpoint merely fails', async () => {
    api.routes({ [TICKET]: failWith(502) })

    await install()

    expect(sockets).toEqual([])
    expect(callAuthChangeHookMock).not.toHaveBeenCalled()
  })

  it.each([
    ['a 502', failWith(502)],
    ['no network', () => { throw new TypeError('Failed to fetch') }],
  ])('tries a ticket that failed with %s again, backing off, until one comes', async (_failure, fail) => {
    let failures = 2
    api.routes({ [TICKET]: () => failures-- > 0 ? fail() : { ticket: `t${++tickets}`, expiresIn: 60 } })

    await install()
    expect(mockLog.error).toHaveBeenLastCalledWith(expect.objectContaining({ action: 'ws:init', attempt: 1, delayMs: 1000 }))
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.callsTo(TICKET)).toHaveLength(2)
    expect(sockets).toEqual([])
    await vi.advanceTimersByTimeAsync(1999)
    expect(api.callsTo(TICKET)).toHaveLength(2)
    await vi.advanceTimersByTimeAsync(1)

    expect(api.callsTo(TICKET)).toHaveLength(3)
    expect(sockets).toHaveLength(1)
  })
})

/** A server end the test plays: what the browser sent, and whether it closed. */
class FakeSocket {
  static last: FakeSocket | undefined
  sent: string[] = []
  closed = false
  onopen: (() => void) | null = null
  onclose: ((event: { code: number, reason: string }) => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onerror: (() => void) | null = null
  private listeners: Array<(event: { data: string }) => void> = []

  constructor(readonly url: string) {
    FakeSocket.last = this
  }

  send(data: string) { this.sent.push(data) }
  close(code = 1000, reason = '') {
    this.closed = true
    this.onclose?.({ code, reason })
  }

  /** The server accepts the connection. */
  accept() { this.onopen?.() }
  /** The server sends a frame. */
  reply(data: string) {
    this.onmessage?.({ data })
    this.listeners.forEach(listener => listener({ data }))
  }

  /** The plugin counts pongs through this. */
  addEventListener(_type: 'message', listener: (event: { data: string }) => void) { this.listeners.push(listener) }

  /** The connection drops without a close frame. */
  drop() { this.onclose?.({ code: 1006, reason: '' }) }
}

/**
 * The heartbeat the plugin configures, driven through VueUse's real
 * `useWebSocket` with the plugin's own options. Django answers each ping
 * with a pong; with no answer the socket is closed and a new one opened.
 */
/**
 * The tabs of one browser share one session cookie. A sign-out in one tab is
 * posted to the others, which reset; a sign-in is posted too, so a tab that
 * acted signed out (every heart outline, `/account` sending the shopper to sign
 * in) asks the session again and becomes the new shopper without a reload
 * (storefront #461). `setup.ts` restores the account on the `loggedIn` flip.
 */
describe('websocket plugin, the other tabs', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    setTenant({ apiDomain: 'api.test.local' })
    sockets.length = 0
    api.routes({ [TICKET]: () => ({ ticket: 't', expiresIn: 60 }) })
    channel.supported = true
    channel.post = vi.fn()
    channel.data = ref(null)
    session.fetch = vi.fn(async () => {
      session.loggedIn!.value = true
    })
  })

  afterEach(() => {
    channel.supported = false
    channel.post = undefined
    channel.data = undefined
    session.fetch = undefined
    vi.useRealTimers()
  })

  it('tells the other tabs when the shopper signs in here', async () => {
    session.loggedIn = ref(false)
    await install()

    session.loggedIn.value = true
    await nextTick()
    await flushPromises()

    expect(channel.post).toHaveBeenCalledWith({ type: 'login' })
  })

  it('says nothing of a session the tab opened with', async () => {
    session.loggedIn = ref(true)

    await install()

    expect(channel.post).not.toHaveBeenCalled()
  })

  it('asks the session again when another tab signed in, and does not echo it', async () => {
    session.loggedIn = ref(false)
    await install()

    channel.data!.value = { type: 'login' }
    await nextTick()
    await flushPromises()

    expect(session.fetch).toHaveBeenCalledOnce()
    expect(session.loggedIn.value).toBe(true)
    expect(sockets).toHaveLength(1)
    expect(channel.post).not.toHaveBeenCalled()
  })

  it('leaves a signed-in tab alone when another tab signs in', async () => {
    session.loggedIn = ref(true)
    await install()

    channel.data!.value = { type: 'login' }
    await nextTick()
    await flushPromises()

    expect(session.fetch).not.toHaveBeenCalled()
  })
})

describe('websocket plugin heartbeat', () => {
  // A stopped scope runs nothing, so each test gets its own.
  let scope = effectScope()

  beforeEach(() => {
    scope = effectScope()
    FakeSocket.last = undefined
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    vi.stubGlobal('WebSocket', FakeSocket)
    setTenant({ apiDomain: 'api.test.local' })
    session.loggedIn = ref(true)
    sockets.length = 0
    tickets = 0
    api.routes({ [TICKET]: () => ({ ticket: `t${++tickets}`, expiresIn: 60 }) })
  })

  afterEach(() => {
    scope.stop()
    vi.useRealTimers()
  })

  /** Open the plugin's latest socket as a real VueUse one, with the options it chose, and accept it. */
  async function acceptForReal(): Promise<FakeSocket> {
    const socket = sockets.at(-1)!
    const options: UseWebSocketOptions = socket.options
    const { useWebSocket } = await vi.importActual<typeof import('@vueuse/core')>('@vueuse/core')
    scope.run(() => useWebSocket(socket.url, options))
    const server = FakeSocket.last!
    server.accept()
    return server
  }

  /** Install the plugin, then open its socket for real. */
  async function connectForReal(): Promise<FakeSocket> {
    await install()
    return acceptForReal()
  }

  it('keeps the socket while the server answers each ping, and never reads the answer as a notification', async () => {
    const server = await connectForReal()

    for (let beat = 0; beat < 20; beat++) {
      await vi.advanceTimersByTimeAsync(30000)
      server.reply('pong')
    }
    await vi.advanceTimersByTimeAsync(5000)

    expect(server.sent).toEqual(Array.from({ length: 20 }, () => 'ping'))
    expect(server.closed).toBe(false)
    // No reconnect: the plugin opened one socket in ten minutes.
    expect(sockets).toHaveLength(1)
    expect(mockLog.error).not.toHaveBeenCalled()
  })

  it('closes a socket whose server stays silent and opens a new one with a fresh ticket', async () => {
    const server = await connectForReal()

    await vi.advanceTimersByTimeAsync(30000)
    expect(server.sent).toEqual(['ping'])
    await vi.advanceTimersByTimeAsync(5000)

    expect(server.closed).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(api.callsTo(TICKET)).toHaveLength(2)
    expect(sockets).toHaveLength(2)
  })

  it('backs off further each time a server that never answers drops the socket', async () => {
    await connectForReal()

    for (const [attempt, delay] of [1000, 2000, 4000].entries()) {
      await vi.advanceTimersByTimeAsync(35000)
      expect(FakeSocket.last!.closed).toBe(true)
      await vi.advanceTimersByTimeAsync(delay - 1)
      expect(sockets, `reconnect ${attempt + 1} came early`).toHaveLength(attempt + 1)
      await vi.advanceTimersByTimeAsync(1)
      expect(sockets).toHaveLength(attempt + 2)
      await acceptForReal()
    }
  })

  it('starts the back-off over after a socket whose server answered, however late the drop', async () => {
    await connectForReal()
    await vi.advanceTimersByTimeAsync(35000)
    await vi.advanceTimersByTimeAsync(1000)
    const server = await acceptForReal()

    for (let beat = 0; beat < 2; beat++) {
      await vi.advanceTimersByTimeAsync(30000)
      server.reply('pong')
    }
    server.drop()
    await vi.advanceTimersByTimeAsync(1000)

    expect(sockets).toHaveLength(3)
  })
})
