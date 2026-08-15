export interface ShopChatMessage {
  id: string
  role: 'user' | 'assistant'
  text: string
}

export type ShopChatStatus = 'ready' | 'streaming' | 'error'

interface ChatDoneEvent {
  conversationId: string
  cartId?: string
  cartMutated: boolean
}

/**
 * First-party shopping chatbot client.
 *
 * Talks to the agent gateway's same-origin `POST /chat` SSE endpoint
 * (Traefik path-routes it to the gateway in production; a Nitro dev
 * proxy covers local dev). Contract: `delta` events stream assistant
 * text, `error` carries a localized message, `done` closes the turn
 * with `{conversationId, cartId?, cartMutated}`. Pre-stream failures
 * are plain JSON `{error}` — 409 means the conversation hit its turn
 * cap and a fresh one must be started.
 *
 * State lives in `useState` so the conversation survives panel
 * close/reopen and route changes within the session.
 */
export const useShopChat = () => {
  const cartStore = useCartStore()
  const { $i18n } = useNuxtApp()

  const messages = useState<ShopChatMessage[]>('shop-chat-messages', () => [])
  const conversationId = useState<string>('shop-chat-conversation', () => '')
  const status = useState<ShopChatStatus>('shop-chat-status', () => 'ready')
  const errorMessage = useState<string>('shop-chat-error', () => '')
  const cartMutated = useState<boolean>('shop-chat-cart-mutated', () => false)

  let controller: AbortController | null = null

  const reset = () => {
    controller?.abort()
    controller = null
    messages.value = []
    conversationId.value = ''
    status.value = 'ready'
    errorMessage.value = ''
  }

  const send = async (text: string) => {
    const message = text.trim()
    if (!message || status.value === 'streaming') {
      return
    }

    errorMessage.value = ''
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

    const failTurn = (msg: string) => {
      // Drop the empty assistant bubble so the error state is clean.
      messages.value = messages.value.filter(
        m => m.id !== assistantId || m.text !== '',
      )
      errorMessage.value = msg
      status.value = 'error'
    }

    controller = new AbortController()
    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: conversationId.value || undefined,
          message,
          cartId: cartStore.cart?.uuid || undefined,
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
          failTurn($i18n.t('chat.error.conversationFull'))
        }
        else {
          failTurn(detail || $i18n.t('chat.error.generic'))
        }
        return
      }

      let done: ChatDoneEvent | null = null
      let streamError = ''
      const parser = createSSEParser(({ event, data }) => {
        if (event === 'delta') {
          const payload = JSON.parse(data) as { text: string }
          appendDelta(payload.text)
        }
        else if (event === 'error') {
          const payload = JSON.parse(data) as { message: string }
          streamError = payload.message
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

      if (streamError) {
        failTurn(streamError)
        return
      }
      if (done !== null) {
        const turn = done as ChatDoneEvent
        conversationId.value = turn.conversationId
        if (turn.cartMutated) {
          cartMutated.value = true
          await cartStore.refreshCart()
        }
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

  const stop = () => {
    controller?.abort()
  }

  return {
    messages,
    conversationId,
    status,
    errorMessage,
    cartMutated,
    send,
    stop,
    reset,
  }
}
