/**
 * Tests for the useShopChat composable (agent-gateway chat client).
 *
 * The composable streams from the same-origin `/chat` SSE endpoint via
 * the raw global `fetch` (a real global, not an auto-import, so
 * `vi.stubGlobal` reaches it), returning a Response whose body is a
 * ReadableStream of SSE bytes. `$api` is mocked for the cart store the
 * composable refreshes after a cart-mutating turn.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { makeCart } from '~~/test/fixtures/cart'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

const encoder = new TextEncoder()

function sseResponse(body: string, chunkSize = 8): Response {
  const bytes = encoder.encode(body)
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Enqueue in small chunks so the parser's buffering is exercised.
      for (let i = 0; i < bytes.length; i += chunkSize) {
        controller.enqueue(bytes.slice(i, i + chunkSize))
      }
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  })
}

/**
 * A stream the test holds open: `push` an event, `close` the turn. It
 * errors when the request's signal aborts, as a real fetch body does.
 */
function openStream() {
  let controller!: ReadableStreamDefaultController<Uint8Array>
  const body = new ReadableStream<Uint8Array>({
    start: (c) => {
      controller = c
    },
  })
  const fetchMock = vi.fn((_url: string, init: RequestInit) => {
    init.signal?.addEventListener('abort', () =>
      controller.error(new DOMException('The operation was aborted.', 'AbortError')))
    return Promise.resolve(new Response(body, { status: 200 }))
  })
  return {
    fetchMock,
    push: (event: string, data: unknown) =>
      controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)),
    close: () => controller.close(),
  }
}

function stubStream(body: string) {
  const fetchMock = vi.fn((_url: string, _init: RequestInit) => Promise.resolve(sseResponse(body)))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const bodyOf = (call: [string, RequestInit]) => JSON.parse(call[1].body as string)

const DONE = 'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n'

describe('useShopChat', () => {
  beforeEach(() => {
    useShopChat().reset()
    useCartStore().cart = null
  })

  it('streams deltas into one assistant message and finishes ready', async () => {
    stubStream(
      'event: delta\ndata: {"text":"Γεια"}\n\n'
      + 'event: delta\ndata: {"text":" σου!"}\n\n'
      + DONE,
    )

    const chat = useShopChat()
    await chat.send('Έχετε καφετιέρες;')

    expect(chat.messages.value).toEqual([
      { id: expect.any(String), role: 'user', text: 'Έχετε καφετιέρες;' },
      { id: expect.any(String), role: 'assistant', text: 'Γεια σου!' },
    ])
    expect(chat.status.value).toBe('ready')
    expect(chat.conversationId.value).toBe('c1')
    expect(chat.errorMessage.value).toBe('')
  })

  it('opens without a conversation id, then continues the one the gateway assigned', async () => {
    const fetchMock = stubStream('event: done\ndata: {"conversationId":"c2","cartMutated":false}\n\n')

    const chat = useShopChat()
    await chat.send('  πρώτο ')
    await chat.send('δεύτερο')

    expect(fetchMock.mock.calls.map(bodyOf)).toEqual([
      { message: 'πρώτο' },
      { conversationId: 'c2', message: 'δεύτερο' },
    ])
  })

  it('names the shopper cart so the agent edits that one', async () => {
    const cart = makeCart()
    useCartStore().cart = cart
    const fetchMock = stubStream(DONE)

    await useShopChat().send('γεια')

    expect(bodyOf(fetchMock.mock.calls[0]!).cartId).toBe(cart.uuid)
  })

  it('reloads the cart when the turn mutated it', async () => {
    const updated = makeCart({ items: [{ id: 1 }, { id: 2, product: { id: 2 } }] })
    api.routes({ '/api/cart': updated })
    stubStream(
      'event: delta\ndata: {"text":"Το πρόσθεσα."}\n\n'
      + 'event: done\ndata: {"conversationId":"c1","cartId":"abc","cartMutated":true}\n\n',
    )

    const chat = useShopChat()
    await chat.send('βάλε το στο καλάθι')

    expect(chat.cartMutated.value).toBe(true)
    expect(useCartStore().cart).toEqual(updated)
  })

  it('leaves the cart alone when the turn did not touch it', async () => {
    api.routes({ '/api/cart': makeCart() })
    stubStream(DONE)

    const chat = useShopChat()
    await chat.send('απλή ερώτηση')

    expect(chat.cartMutated.value).toBe(false)
    expect(useCartStore().cart).toBeNull()
  })

  it('tracks each tool call, closing the latest running entry of the same name', async () => {
    stubStream(
      'event: tool\ndata: {"name":"search","status":"running"}\n\n'
      + 'event: tool\ndata: {"name":"search","status":"running"}\n\n'
      + 'event: tool\ndata: {"name":"search","status":"done"}\n\n'
      + 'event: tool\ndata: {"name":"cart_add","status":"running"}\n\n'
      + 'event: tool\ndata: {"name":"cart_add","status":"done"}\n\n'
      + DONE,
    )

    const chat = useShopChat()
    await chat.send('ψάξε')

    expect(chat.messages.value[1]!.tools).toEqual([
      { name: 'search', status: 'running' },
      { name: 'search', status: 'done' },
      { name: 'cart_add', status: 'done' },
    ])
  })

  it.each([
    [409, { error: 'this conversation is finished' }, 'chat.error.conversationFull'],
    [500, { error: 'Ο βοηθός δεν είναι διαθέσιμος.' }, null],
    [502, 'upstream html page', 'chat.error.generic'],
  ])('fails a %i before the stream with the right message and no assistant bubble', async (status, body, key) => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      typeof body === 'string' ? body : JSON.stringify(body),
      { status },
    ))))

    const chat = useShopChat()
    await chat.send('γεια')

    // The gateway's own words win, except on the turn cap (its own copy)
    // and when there are none (a non-JSON body).
    const expected = key ? useNuxtApp().$i18n.t(key) : (body as { error: string }).error
    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toBe(expected)
    expect(chat.messages.value.map(m => m.role)).toEqual(['user'])
  })

  it('fails the turn when the stream emits an error event', async () => {
    stubStream('event: error\ndata: {"message":"Η συνομιλία διακόπηκε."}\n\n')

    const chat = useShopChat()
    await chat.send('γεια')

    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toBe('Η συνομιλία διακόπηκε.')
  })

  it('fails the turn with the generic message on a network failure', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('network down'))))

    const chat = useShopChat()
    await chat.send('γεια')

    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toBe(useNuxtApp().$i18n.t('chat.error.generic'))
  })

  it('ignores blank input', async () => {
    const fetchMock = stubStream(DONE)

    await useShopChat().send('   ')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('ignores a second send while a stream is still open', async () => {
    const stream = openStream()
    vi.stubGlobal('fetch', stream.fetchMock)

    const chat = useShopChat()
    const first = chat.send('πρώτο')
    await vi.waitFor(() => expect(stream.fetchMock).toHaveBeenCalledTimes(1), { interval: 1 })
    expect(chat.status.value).toBe('streaming')

    await chat.send('δεύτερο')
    expect(stream.fetchMock).toHaveBeenCalledTimes(1)
    expect(chat.messages.value.filter(m => m.role === 'user').map(m => m.text)).toEqual(['πρώτο'])

    stream.push('done', { conversationId: 'c1', cartMutated: false })
    stream.close()
    await first
    expect(chat.status.value).toBe('ready')
  })

  it('stop() aborts the open stream and returns to ready without an error', async () => {
    const stream = openStream()
    vi.stubGlobal('fetch', stream.fetchMock)

    const chat = useShopChat()
    const turn = chat.send('γεια')
    await vi.waitFor(() => expect(stream.fetchMock).toHaveBeenCalledTimes(1), { interval: 1 })
    stream.push('delta', { text: 'Μισή απάντ' })
    await vi.waitFor(() => expect(chat.messages.value[1]?.text).toBe('Μισή απάντ'), { interval: 1 })

    chat.stop()
    await turn

    expect(chat.status.value).toBe('ready')
    expect(chat.errorMessage.value).toBe('')
    expect(chat.messages.value[1]!.text).toBe('Μισή απάντ')
  })

  it('shares whether the assistant is open between every caller', () => {
    useShopChat().open.value = true

    expect(useShopChat().open.value).toBe(true)

    useShopChat().open.value = false
  })

  it('reset clears the conversation state', async () => {
    stubStream('event: delta\ndata: {"text":"x"}\n\nevent: done\ndata: {"conversationId":"c9","cartMutated":false}\n\n')

    const chat = useShopChat()
    await chat.send('γεια')
    expect(chat.messages.value).toHaveLength(2)

    chat.reset()
    expect(chat.messages.value).toHaveLength(0)
    expect(chat.conversationId.value).toBe('')
    expect(chat.status.value).toBe('ready')
  })
})
