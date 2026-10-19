/**
 * Tests for the useShopChat composable (agent-gateway chat client).
 *
 * The composable streams from the same-origin `/chat` SSE endpoint via
 * the raw global `fetch` (a real global, not an auto-import, so
 * `vi.stubGlobal` reaches it), returning a Response whose body is a
 * ReadableStream of SSE bytes. `$api` is mocked for the cart store the
 * composable refreshes after a cart-mutating turn.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { makeCart } from '~~/test/fixtures/cart'
import { failWith } from '~~/test/helpers/api'

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
      { message: 'πρώτο', turnId: expect.any(String) },
      { conversationId: 'c2', message: 'δεύτερο', turnId: expect.any(String) },
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
    const own = makeCart()
    useCartStore().cart = own
    const updated = makeCart({ uuid: own.uuid, items: [{ id: 1 }, { id: 2, product: { id: 2 } }] })
    api.routes({ '/api/cart': updated })
    stubStream(
      'event: delta\ndata: {"text":"Το πρόσθεσα."}\n\n'
      + `event: done\ndata: {"conversationId":"c1","cartId":"${own.uuid}","cartMutated":true}\n\n`,
    )

    const chat = useShopChat()
    await chat.send('βάλε το στο καλάθι')

    expect(chat.cartMutated.value).toBe(true)
    expect(useCartStore().cart).toEqual(updated)
    expect(api.callsTo('/api/cart/claim')).toEqual([])
  })

  // The assistant's add_to_cart creates a cart for a browser that sent
  // none; reloading the browser's own found nothing, and the shopper saw
  // an empty cart after the assistant said it added the product
  // (gateway#24).
  it('takes the cart the assistant created when the browser had none', async () => {
    const created = makeCart({ uuid: '6f1c1f3e-2d6a-4b0f-9a3e-2f6d6c1b9a10' })
    api.routes({ '/api/cart/claim': created })
    stubStream(`event: done\ndata: {"conversationId":"c1","cartId":"${created.uuid}","cartMutated":true}\n\n`)

    await useShopChat().send('βάλε το στο καλάθι')

    expect(api.callsTo('/api/cart/claim')).toEqual([
      expect.objectContaining({ options: expect.objectContaining({ method: 'POST', body: { uuid: created.uuid } }) }),
    ])
    expect(useCartStore().cart).toEqual(created)
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

  it('keeps a failed step as failed', async () => {
    stubStream(
      'event: tool\ndata: {"name":"add_to_cart","status":"running"}\n\n'
      + 'event: tool\ndata: {"name":"add_to_cart","status":"error"}\n\n'
      + 'event: delta\ndata: {"text":"Υπάρχουν μόνο 2."}\n\n'
      + DONE,
    )

    const chat = useShopChat()
    await chat.send('βάλε 5')

    expect(chat.messages.value[1]!.tools).toEqual([
      { name: 'add_to_cart', status: 'error' },
    ])
  })

  it('marks a step still running when the turn died as failed, and keeps it on screen', async () => {
    stubStream(
      'event: tool\ndata: {"name":"add_to_cart","status":"running"}\n\n'
      + 'event: error\ndata: {"message":"Η συνομιλία διακόπηκε."}\n\n',
    )

    const chat = useShopChat()
    await chat.send('βάλε το')

    expect(chat.messages.value.map(m => m.role)).toEqual(['user', 'assistant'])
    expect(chat.messages.value[1]!.tools).toEqual([
      { name: 'add_to_cart', status: 'error' },
    ])
  })

  describe('rate limits', () => {
    it('says when to try again from the Retry-After of a 429, in the page language', async () => {
      const { $i18n } = useNuxtApp()
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
        'Too Many Requests', { status: 429, headers: { 'Retry-After': '300' } },
      ))))

      const chat = useShopChat()
      await chat.send('γεια')

      expect(chat.errorMessage.value).toBe($i18n.t('chat.error.rateLimited', {
        when: retryWhen(300, $i18n.locale.value),
      }))
      expect(chat.errorMessage.value).toContain('5')
      expect(chat.canRetry.value).toBe(true)
    })

    it('says "in a little while" for a 429 without a wait, whatever its body', async () => {
      const { $i18n } = useNuxtApp()
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
        JSON.stringify({ error: 'rate limited, retry later' }), { status: 429 },
      ))))

      const chat = useShopChat()
      await chat.send('γεια')

      expect(chat.errorMessage.value).toBe($i18n.t('chat.error.rateLimitedSoon'))
    })

    it('says when to try again when the model was throttled mid-turn', async () => {
      const { $i18n } = useNuxtApp()
      stubStream('event: error\ndata: {"message":"busy","code":"rate_limited","retryAfter":42}\n\n')

      const chat = useShopChat()
      await chat.send('γεια')

      expect(chat.errorMessage.value).toBe($i18n.t('chat.error.rateLimited', {
        when: retryWhen(42, $i18n.locale.value),
      }))
    })
  })

  describe('retry', () => {
    it('sends the failed message again with its turn id, in place of the failed attempt', async () => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(sseResponse('event: error\ndata: {"message":"Η συνομιλία διακόπηκε."}\n\n'))
        .mockResolvedValueOnce(sseResponse('event: delta\ndata: {"text":"Έγινε."}\n\n' + DONE))
      vi.stubGlobal('fetch', fetchMock)

      const chat = useShopChat()
      await chat.send('βάλε το στο καλάθι')
      expect(chat.canRetry.value).toBe(true)
      await chat.retry()

      const [first, second] = fetchMock.mock.calls.map(c => bodyOf(c as [string, RequestInit]))
      expect(second.message).toBe('βάλε το στο καλάθι')
      expect(second.turnId).toBe(first.turnId)
      expect(chat.messages.value.map(m => [m.role, m.text])).toEqual([
        ['user', 'βάλε το στο καλάθι'],
        ['assistant', 'Έγινε.'],
      ])
      expect(chat.status.value).toBe('ready')
      expect(chat.errorMessage.value).toBe('')
      expect(chat.canRetry.value).toBe(false)
    })

    it('gives every new message its own turn id', async () => {
      const fetchMock = stubStream(DONE)

      const chat = useShopChat()
      await chat.send('πρώτο')
      await chat.send('δεύτερο')

      const [first, second] = fetchMock.mock.calls.map(bodyOf)
      expect(first.turnId).not.toBe(second.turnId)
    })

    it('is not offered once the conversation is over', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
        JSON.stringify({ error: 'finished' }), { status: 409 },
      ))))

      const chat = useShopChat()
      await chat.send('γεια')

      expect(chat.canRetry.value).toBe(false)
    })

    it('is forgotten by reset', async () => {
      stubStream('event: error\ndata: {"message":"x"}\n\n')

      const chat = useShopChat()
      await chat.send('γεια')
      chat.reset()

      expect(chat.canRetry.value).toBe(false)
    })
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

  it('fails a turn whose stream was cut off before done, and offers to send it again', async () => {
    stubStream('event: delta\ndata: {"text":"Το προσθέτω"}\n\n')

    const chat = useShopChat()
    await chat.send('βάλε το')

    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toBe(useNuxtApp().$i18n.t('chat.error.generic'))
    expect(chat.canRetry.value).toBe(true)
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

  it('reset forgets that the last turn changed the cart', async () => {
    useCartStore().refreshCart = vi.fn(() => Promise.resolve())
    stubStream('event: done\ndata: {"conversationId":"c1","cartId":"abc","cartMutated":true}\n\n')

    const chat = useShopChat()
    await chat.send('βάλε το στο καλάθι')
    expect(chat.cartMutated.value).toBe(true)

    chat.reset()

    expect(chat.cartMutated.value).toBe(false)
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

  describe('a signed-in shopper', () => {
    const MINTED = (token: string) => ({ token, expiresIn: 1800 })
    const signIn = (id: number | null) => {
      useState('nuxt-session').value = id ? { user: { id } } : null
    }
    const tokenCalls = () => api.callsTo('/api/cart/agent-token')
    // The browser logger posts to its own ingest through the same fetch.
    const chatCalls = (fetchMock: { mock: { calls: [string, RequestInit][] } }) =>
      fetchMock.mock.calls.filter(([url]) => url === '/chat')
    const tokensSent = (fetchMock: { mock: { calls: [string, RequestInit][] } }) =>
      chatCalls(fetchMock).map(call => bodyOf(call).cartToken)

    beforeEach(() => signIn(6))
    afterEach(() => signIn(null))

    it('sends the cart token instead of a cart id, and mints it once for the conversation', async () => {
      useCartStore().cart = makeCart()
      api.routes({ '/api/cart/agent-token': MINTED('pass-1') })
      const fetchMock = stubStream(DONE)

      const chat = useShopChat()
      await chat.send('πρώτο')
      await chat.send('δεύτερο')

      expect(chatCalls(fetchMock).map(bodyOf)).toEqual([
        { message: 'πρώτο', cartToken: 'pass-1', turnId: expect.any(String) },
        { conversationId: 'c1', message: 'δεύτερο', cartToken: 'pass-1', turnId: expect.any(String) },
      ])
      expect(tokenCalls()).toHaveLength(1)
      expect(tokenCalls()[0]!.options).toMatchObject({ method: 'POST' })
    })

    it('mints a new token for the next turn after the gateway refused it', async () => {
      let minted = 0
      api.routes({ '/api/cart/agent-token': () => MINTED(`pass-${++minted}`) })
      const refused = 'event: done\ndata: {"conversationId":"c1","cartMutated":false,"cartTokenRefused":true}\n\n'
      const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
        Promise.resolve(sseResponse(fetchMock.mock.calls.length === 1 ? refused : DONE)))
      vi.stubGlobal('fetch', fetchMock)

      const chat = useShopChat()
      await chat.send('πρώτο')
      await chat.send('δεύτερο')
      await chat.send('τρίτο')

      expect(tokensSent(fetchMock)).toEqual(['pass-1', 'pass-2', 'pass-2'])
      expect(tokenCalls()).toHaveLength(2)
    })

    it('ignores done.cartId and refreshes the shopper\'s own cart on a mutation', async () => {
      const own = makeCart()
      const updated = makeCart({ uuid: own.uuid, items: [{ id: 1 }, { id: 2, product: { id: 2 } }] })
      api.routes({ '/api/cart/agent-token': MINTED('pass-1'), '/api/cart': updated })
      stubStream('event: done\ndata: {"conversationId":"c1","cartId":"6f1c1f3e-2d6a-4b0f-9a3e-2f6d6c1b9a10","cartMutated":true}\n\n')

      await useShopChat().send('βάλε το στο καλάθι')

      expect(api.callsTo('/api/cart/claim')).toEqual([])
      expect(useCartStore().cart).toEqual(updated)
    })

    it('fails the turn, without calling the gateway, when no token can be minted', async () => {
      api.routes({ '/api/cart/agent-token': failWith(502) })
      const fetchMock = stubStream(DONE)

      const chat = useShopChat()
      await chat.send('γεια')

      expect(chatCalls(fetchMock)).toEqual([])
      expect(chat.status.value).toBe('error')
    })

    it('drops the token on sign-out and sends none to the visitor that follows', async () => {
      api.routes({ '/api/cart/agent-token': () => MINTED('pass-x') })
      const fetchMock = stubStream(DONE)

      const chat = useShopChat()
      await chat.send('πρώτο')
      signIn(null)
      await chat.send('δεύτερο')
      signIn(6)
      await chat.send('τρίτο')

      expect(tokensSent(fetchMock)).toEqual(['pass-x', undefined, 'pass-x'])
      expect(tokenCalls()).toHaveLength(2)
    })

    it('never reuses one shopper\'s token for another account', async () => {
      let minted = 0
      api.routes({ '/api/cart/agent-token': () => MINTED(`pass-${++minted}`) })
      const fetchMock = stubStream(DONE)

      const chat = useShopChat()
      await chat.send('πρώτο')
      signIn(7)
      await chat.send('δεύτερο')

      expect(tokensSent(fetchMock)).toEqual(['pass-1', 'pass-2'])
    })

    it('does not mint for a visitor, who keeps naming the cart the browser holds', async () => {
      signIn(null)
      const cart = makeCart()
      useCartStore().cart = cart
      const fetchMock = stubStream(DONE)

      await useShopChat().send('γεια')

      expect(tokenCalls()).toEqual([])
      expect(bodyOf(chatCalls(fetchMock)[0]!)).toEqual({ message: 'γεια', cartId: cart.uuid, turnId: expect.any(String) })
    })

    it('adopts done.cartId on an anonymous turn', async () => {
      signIn(null)
      const created = makeCart({ uuid: '6f1c1f3e-2d6a-4b0f-9a3e-2f6d6c1b9a10' })
      api.routes({ '/api/cart/claim': created })
      stubStream(`event: done\ndata: {"conversationId":"c1","cartId":"${created.uuid}","cartMutated":true}\n\n`)

      await useShopChat().send('βάλε το στο καλάθι')

      expect(useCartStore().cart).toEqual(created)
    })
  })

  describe('products events', () => {
    const productsEvent = (data: unknown) => `event: products\ndata: ${JSON.stringify(data)}\n\n`

    it('attaches the listed ids to the streaming message at the text position they arrived', async () => {
      stubStream(
        'event: delta\ndata: {"text":"Ψάχνω. "}\n\n'
        + productsEvent({ tool: 'search_products', query: 'καφετιέρα', total: 14, products: [{ id: 7 }, { id: 3 }] })
        + 'event: delta\ndata: {"text":"Βρήκα 14."}\n\n'
        + DONE,
      )

      const chat = useShopChat()
      await chat.send('καφετιέρα')

      expect(chat.messages.value[1]).toEqual({
        id: expect.any(String),
        role: 'assistant',
        text: 'Ψάχνω. Βρήκα 14.',
        products: [{ tool: 'search_products', query: 'καφετιέρα', total: 14, ids: [7, 3], at: 'Ψάχνω. '.length }],
      })
      expect(chat.status.value).toBe('ready')
    })

    it('keeps an empty search that still reports its total', async () => {
      stubStream(productsEvent({ tool: 'search_products', query: 'xyz', total: 0, products: [] }) + DONE)

      const chat = useShopChat()
      await chat.send('xyz')

      expect(chat.messages.value[1]!.products).toEqual([
        { tool: 'search_products', query: 'xyz', total: 0, ids: [], at: 0 },
      ])
    })

    it('keeps each event of the turn in order', async () => {
      stubStream(
        productsEvent({ tool: 'search_products', products: [{ id: 1 }] })
        + productsEvent({ tool: 'get_product', products: [{ id: 2 }] })
        + DONE,
      )

      const chat = useShopChat()
      await chat.send('δείξε')

      expect(chat.messages.value[1]!.products?.map(p => [p.tool, p.ids])).toEqual([
        ['search_products', [1]],
        ['get_product', [2]],
      ])
    })

    it.each([
      ['an id that is not a number', { tool: 'get_product', products: [{ id: 'abc' }] }],
      ['a missing tool', { products: [{ id: 1 }] }],
      ['a negative total', { tool: 'search_products', total: -1, products: [] }],
      ['no list', { tool: 'search_products' }],
    ])('ignores %s and finishes the turn normally', async (_case, payload) => {
      stubStream(
        productsEvent(payload)
        + 'event: delta\ndata: {"text":"ok"}\n\n'
        + DONE,
      )

      const chat = useShopChat()
      await chat.send('γεια')

      expect(chat.messages.value[1]!.products).toBeUndefined()
      expect(chat.messages.value[1]!.text).toBe('ok')
      expect(chat.status.value).toBe('ready')
    })

    it('ignores a payload that is not JSON', async () => {
      stubStream('event: products\ndata: not-json\n\n' + DONE)

      const chat = useShopChat()
      await chat.send('γεια')

      expect(chat.messages.value[1]!.products).toBeUndefined()
      expect(chat.status.value).toBe('ready')
    })
  })
})
