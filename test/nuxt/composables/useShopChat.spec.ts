/**
 * Tests for the useShopChat composable (agent-gateway chat client).
 *
 * The composable streams from the same-origin `/chat` SSE endpoint via
 * the raw global `fetch` (not `$fetch`), so the stream is mocked with
 * `vi.stubGlobal('fetch', …)` returning a Response whose body is a
 * ReadableStream of SSE bytes. `$fetch` is mocked at module level for
 * the cart store's refresh (and Nuxt bootstrap calls).
 *
 * Needs the Nuxt environment: useState, useNuxtApp().$i18n (real i18n
 * returns Greek — messages are asserted as non-empty strings, not copy).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'

const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(() => Promise.resolve({})),
}))

mockNuxtImport('$fetch', () => mockFetch)

function sseResponse(body: string, chunkSize = 8): Response {
  const encoder = new TextEncoder()
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

function jsonErrorResponse(status: number, error: string): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('useShopChat', () => {
  beforeEach(() => {
    mockFetch.mockClear()
    const chat = useShopChat()
    chat.reset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('streams deltas into one assistant message and finishes ready', async () => {
    const streamFetch = vi.fn(() =>
      Promise.resolve(
        sseResponse(
          'event: delta\ndata: {"text":"Γεια"}\n\n'
          + 'event: delta\ndata: {"text":" σου!"}\n\n'
          + 'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n',
        ),
      ),
    )
    vi.stubGlobal('fetch', streamFetch)

    const chat = useShopChat()
    await chat.send('Έχετε καφετιέρες;')

    expect(chat.messages.value).toHaveLength(2)
    expect(chat.messages.value[0]).toMatchObject({
      role: 'user',
      text: 'Έχετε καφετιέρες;',
    })
    expect(chat.messages.value[1]).toMatchObject({
      role: 'assistant',
      text: 'Γεια σου!',
    })
    expect(chat.status.value).toBe('ready')
    expect(chat.conversationId.value).toBe('c1')
    expect(chat.errorMessage.value).toBe('')
  })

  it('sends the conversation id and message in the request body', async () => {
    const streamFetch = vi.fn(() =>
      Promise.resolve(
        sseResponse(
          'event: done\ndata: {"conversationId":"c2","cartMutated":false}\n\n',
        ),
      ),
    )
    vi.stubGlobal('fetch', streamFetch)

    const chat = useShopChat()
    await chat.send('πρώτο')
    await chat.send('δεύτερο')

    expect(streamFetch).toHaveBeenCalledTimes(2)
    const secondBody = JSON.parse(
      (streamFetch.mock.calls[1] as unknown as [string, RequestInit])[1]
        .body as string,
    )
    expect(secondBody.conversationId).toBe('c2')
    expect(secondBody.message).toBe('δεύτερο')
  })

  it('refreshes the cart store when the turn mutated the cart', async () => {
    const streamFetch = vi.fn(() =>
      Promise.resolve(
        sseResponse(
          'event: delta\ndata: {"text":"Το πρόσθεσα."}\n\n'
          + 'event: done\ndata: {"conversationId":"c1","cartId":"abc","cartMutated":true}\n\n',
        ),
      ),
    )
    vi.stubGlobal('fetch', streamFetch)

    const chat = useShopChat()
    await chat.send('βάλε το στο καλάθι')

    expect(chat.cartMutated.value).toBe(true)
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/cart',
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('surfaces the 409 turn cap as a localized error without an assistant bubble', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          jsonErrorResponse(409, 'this conversation is finished'),
        ),
      ),
    )

    const chat = useShopChat()
    await chat.send('γεια')

    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toEqual(expect.any(String))
    expect(chat.errorMessage.value.length).toBeGreaterThan(0)
    expect(chat.messages.value).toHaveLength(1)
    expect(chat.messages.value[0]!.role).toBe('user')
  })

  it('fails the turn when the stream emits an error event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          sseResponse(
            'event: error\ndata: {"message":"Η συνομιλία διακόπηκε."}\n\n',
          ),
        ),
      ),
    )

    const chat = useShopChat()
    await chat.send('γεια')

    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value).toBe('Η συνομιλία διακόπηκε.')
  })

  it('fails the turn with a generic message on network failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('network down'))),
    )

    const chat = useShopChat()
    await chat.send('γεια')

    expect(chat.status.value).toBe('error')
    expect(chat.errorMessage.value.length).toBeGreaterThan(0)
  })

  it('ignores empty input and concurrent sends while streaming', async () => {
    const streamFetch = vi.fn(() =>
      Promise.resolve(
        sseResponse(
          'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n',
        ),
      ),
    )
    vi.stubGlobal('fetch', streamFetch)

    const chat = useShopChat()
    await chat.send('   ')
    expect(streamFetch).not.toHaveBeenCalled()

    await chat.send('γεια')
    expect(streamFetch).toHaveBeenCalledTimes(1)
  })

  it('reset clears the conversation state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve(
          sseResponse(
            'event: delta\ndata: {"text":"x"}\n\n'
            + 'event: done\ndata: {"conversationId":"c9","cartMutated":false}\n\n',
          ),
        ),
      ),
    )

    const chat = useShopChat()
    await chat.send('γεια')
    expect(chat.messages.value.length).toBeGreaterThan(0)

    chat.reset()
    expect(chat.messages.value).toHaveLength(0)
    expect(chat.conversationId.value).toBe('')
    expect(chat.status.value).toBe('ready')
  })
})
