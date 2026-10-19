export interface ShopChatTool {
  name: string
  status: 'running' | 'done' | 'error'
}

/**
 * A `products` event attached to the message it arrived in. `at` is how
 * much of the message's text had streamed when it arrived, so the cards
 * render where the assistant surfaced them rather than after the answer.
 */
export interface ShopChatProducts {
  tool: string
  query?: string
  total?: number
  ids: number[]
  at: number
}

export interface ShopChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
  tools?: ShopChatTool[]
  products?: ShopChatProducts[]
}

export type ShopChatStatus = 'ready' | 'streaming' | 'error'

/** The turn a shopper can send again: the message and the turn id it went with. */
interface ShopChatFailedTurn {
  text: string
  turnId: string
}

interface ChatErrorEvent {
  message: string
  code?: string
  retryAfter?: number
}

interface ChatDoneEvent {
  conversationId: string
  cartId?: string
  cartMutated: boolean
  cartTokenRefused?: boolean
}

/**
 * First-party shopping chatbot client.
 *
 * Talks to the agent gateway's same-origin `POST /chat` SSE endpoint
 * (Traefik path-routes it to the gateway in production; a Nitro dev
 * proxy covers local dev). Contract: `delta` events stream assistant
 * text, `tool` events report tool activity as `{name, status}`
 * (running|done|error), `products` lists the ids a product tool surfaced
 * (`zChatProductsEvent`), `error` carries a localized message (and
 * `code: rate_limited` with `retryAfter` seconds when the model was
 * throttled), `done` closes the turn with `{conversationId, cartId?,
 * cartMutated, cartTokenRefused}`. Pre-stream failures are plain JSON
 * `{error}` — 409 means the conversation hit its turn cap and a fresh
 * one must be started; a 429 (from any layer) carries `Retry-After`.
 *
 * Each message goes with a `turnId`. A failed turn can be sent again
 * (`retry`) with the same id, and the gateway then keys the turn's cart
 * changes as the first attempt's: an item the first attempt did add is
 * not added twice.
 *
 * A signed-in shopper's turns carry a `cartToken`, the pass the assistant
 * edits THAT shopper's cart with (`POST /api/cart/agent-token`). One is
 * minted for the conversation and reused until the gateway reports it
 * refused (`cartTokenRefused`), when the next turn mints another. It
 * stays in memory, tied to the user it was minted for, so a sign-out (or
 * another account) never reuses it. A turn that sent one gets no
 * `done.cartId`, and the widget would ignore it: the cart is the
 * shopper's own, refreshed through their session.
 *
 * State lives in `useState` so the conversation survives panel
 * close/reopen and route changes within the session.
 */
export const useShopChat = () => {
  const cartStore = useCartStore()
  const { $i18n } = useNuxtApp()
  const { user } = useUserSession()

  const messages = useState<ShopChatMessage[]>('shop-chat-messages', () => [])
  const conversationId = useState<string>('shop-chat-conversation', () => '')
  const status = useState<ShopChatStatus>('shop-chat-status', () => 'ready')
  const errorMessage = useState<string>('shop-chat-error', () => '')
  const cartMutated = useState<boolean>('shop-chat-cart-mutated', () => false)
  // The turn that failed and can be sent again; null when there is none.
  const failedTurn = useState<ShopChatFailedTurn | null>('shop-chat-failed-turn', () => null)
  // Whether the assistant is on screen: the launcher and its panel share it.
  const open = useState<boolean>('shop-chat-open', () => false)
  // Never persisted or rendered server-side: it is set from a client turn.
  const cartPass = useState<{ token: string, userId: number } | null>('shop-chat-cart-pass', () => null)

  let controller: AbortController | null = null

  const reset = () => {
    controller?.abort()
    controller = null
    messages.value = []
    conversationId.value = ''
    status.value = 'ready'
    errorMessage.value = ''
    cartMutated.value = false
    failedTurn.value = null
    cartPass.value = null
  }

  /** The signed-in shopper's cart token, minted once and reused; none for a visitor. */
  const cartTokenFor = async (): Promise<string | undefined> => {
    const userId = user.value?.id
    if (!userId) {
      cartPass.value = null
      return undefined
    }
    if (cartPass.value?.userId !== userId) {
      const { token } = await $api<CartAgentTokenResponse>('/api/cart/agent-token', { method: 'POST' })
      cartPass.value = { token, userId }
    }
    return cartPass.value.token
  }

  /** "Try again in 5 minutes", in the page's language, from a wait in seconds. */
  const rateLimitedMessage = (seconds: number | undefined) =>
    seconds && seconds > 0
      ? $i18n.t('chat.error.rateLimited', { when: retryWhen(seconds, $i18n.locale.value) })
      : $i18n.t('chat.error.rateLimitedSoon')

  const run = async (message: string, turnId: string) => {
    errorMessage.value = ''
    failedTurn.value = null
    status.value = 'streaming'
    cartMutated.value = false
    messages.value = [
      ...messages.value,
      { id: crypto.randomUUID(), role: 'user', text: message },
    ]
    const assistantId = crypto.randomUUID()
    messages.value = [
      ...messages.value,
      { id: assistantId, role: 'assistant', text: '' },
    ]

    const appendDelta = (delta: string) => {
      messages.value = messages.value.map(m =>
        m.id === assistantId ? { ...m, text: m.text + delta } : m,
      )
    }

    const setTool = (name: string, toolStatus: ShopChatTool['status']) => {
      messages.value = messages.value.map((m) => {
        if (m.id !== assistantId) return m
        const tools = [...(m.tools ?? [])]
        if (toolStatus === 'running') {
          tools.push({ name, status: 'running' })
        }
        else {
          // Close the most recent running entry for this tool, as done or
          // failed — the model may call the same tool more than once per
          // turn.
          for (let i = tools.length - 1; i >= 0; i--) {
            const tool = tools[i]
            if (tool && tool.name === name && tool.status === 'running') {
              tools[i] = { name, status: toolStatus }
              break
            }
          }
        }
        return { ...m, tools }
      })
    }

    const addProducts = (event: ChatProductsEvent) => {
      messages.value = messages.value.map(m =>
        m.id === assistantId
          ? {
              ...m,
              products: [
                ...(m.products ?? []),
                {
                  tool: event.tool,
                  query: event.query,
                  total: event.total,
                  ids: event.products.map(product => product.id),
                  at: m.text.length,
                },
              ],
            }
          : m,
      )
    }

    const failTurn = (msg: string, retryable = true) => {
      // A step still running when the turn died never finished. Drop an
      // assistant bubble left with nothing in it so the error state is
      // clean.
      messages.value = messages.value
        .map(m => m.id === assistantId && m.tools
          ? { ...m, tools: m.tools.map(tool => tool.status === 'running' ? { ...tool, status: 'error' as const } : tool) }
          : m)
        .filter(m => m.id !== assistantId || m.text !== '' || (m.tools?.length ?? 0) > 0)
      errorMessage.value = msg
      failedTurn.value = retryable ? { text: message, turnId } : null
      status.value = 'error'
    }

    controller = new AbortController()
    try {
      const cartToken = await cartTokenFor()
      // A turn with a token acts on the shopper's own cart: the id is
      // only for a visitor, whose cart the browser names.
      const sentCartId = cartToken ? undefined : cartStore.cart?.uuid || undefined
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId.value || undefined,
          message,
          cartId: sentCartId,
          cartToken,
          turnId,
        }),
        signal: controller.signal,
      })

      if (!response.ok || !response.body) {
        let detail = ''
        try {
          const payload = await response.json()
          detail = payload?.error || ''
        }
        catch {
          // Non-JSON error body — fall through to the generic message.
        }
        if (response.status === 409) {
          failTurn($i18n.t('chat.error.conversationFull'), false)
        }
        else if (response.status === 429) {
          // Traefik, the gateway's limiter and its turn quota all answer
          // 429, not all in the page's language, and not all with a
          // Retry-After (Traefik's burst refusal has none).
          failTurn(rateLimitedMessage(Number(response.headers.get('Retry-After')) || undefined))
        }
        else {
          failTurn(detail || $i18n.t('chat.error.generic'))
        }
        return
      }

      let done: ChatDoneEvent | null = null
      let streamError: ChatErrorEvent | null = null
      const parser = createSSEParser(({ event, data }) => {
        if (event === 'delta') {
          const payload = JSON.parse(data) as { text: string }
          appendDelta(payload.text)
        }
        else if (event === 'tool') {
          const payload = JSON.parse(data) as ShopChatTool
          setTool(payload.name, payload.status)
        }
        else if (event === 'products') {
          // Cards are an enhancement: a payload that does not fit the
          // contract is dropped, never allowed to fail the turn.
          let payload: unknown
          try {
            payload = JSON.parse(data)
          }
          catch {
            return
          }
          const parsed = zChatProductsEvent.safeParse(payload)
          if (parsed.success) {
            addProducts(parsed.data)
          }
        }
        else if (event === 'error') {
          streamError = JSON.parse(data) as ChatErrorEvent
        }
        else if (event === 'done') {
          done = JSON.parse(data) as ChatDoneEvent
        }
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      for (;;) {
        const { done: readerDone, value } = await reader.read()
        if (readerDone) {
          break
        }
        parser.feed(decoder.decode(value, { stream: true }))
      }

      if (streamError !== null) {
        const failure = streamError as ChatErrorEvent
        failTurn(failure.code === 'rate_limited'
          ? rateLimitedMessage(failure.retryAfter)
          : failure.message)
        return
      }
      // Every turn the gateway finishes ends with `done`: a stream that
      // closed without one was cut off.
      if (done === null) {
        failTurn($i18n.t('chat.error.generic'))
        return
      }
      const turn = done as ChatDoneEvent
      conversationId.value = turn.conversationId
      if (turn.cartTokenRefused) cartPass.value = null
      if (turn.cartMutated) {
        cartMutated.value = true
        // A browser that had no cart takes the one the assistant
        // created: refreshing would reload its own, still none, and the
        // assistant reported an add the shopper's cart never showed.
        if (!cartToken && !sentCartId && turn.cartId) await cartStore.claimCart(turn.cartId)
        else await cartStore.refreshCart()
      }
      status.value = 'ready'
    }
    catch (error) {
      if (controller?.signal.aborted) {
        status.value = 'ready'
        return
      }
      log.error({ action: 'shopChat:send', error })
      failTurn($i18n.t('chat.error.generic'))
    }
    finally {
      controller = null
    }
  }

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || status.value === 'streaming') {
      return
    }
    await run(message, crypto.randomUUID())
  }

  /**
   * Sends the failed turn again, with its turn id, in place of the
   * attempt that failed.
   */
  const retry = async () => {
    const turn = failedTurn.value
    if (!turn || status.value === 'streaming') {
      return
    }
    const lastUser = messages.value.findLastIndex(m => m.role === 'user')
    if (lastUser >= 0) {
      messages.value = messages.value.slice(0, lastUser)
    }
    await run(turn.text, turn.turnId)
  }

  const stop = () => {
    controller?.abort()
  }

  return {
    messages,
    conversationId,
    status,
    errorMessage,
    cartMutated,
    canRetry: computed(() => failedTurn.value !== null),
    open,
    send,
    retry,
    stop,
    reset,
  }
}
