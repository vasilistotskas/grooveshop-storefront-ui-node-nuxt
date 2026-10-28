import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ChatPanel from '~/components/Chat/Panel.vue'
import ChromeAssistantPanel from '~/components/Chrome/AssistantPanel.vue'
import { trees } from '~~/test/helpers/trees'
import { makeProduct } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

/**
 * The shop assistant's two panels (`Chrome/AssistantPanel` is the default
 * design's, `Chat/Panel` webside's) read one ordering, `chatSegments`.
 * The gateway sends `products` the moment a tool returns, before the
 * words that introduce the cards: the cards follow those words.
 */
const reply = (body: string) => new Response(new TextEncoder().encode(body), { status: 200 })

describe.each(trees(ChromeAssistantPanel, ChatPanel))('$tree assistant panel product order', ({ C }) => {
  beforeEach(() => {
    useShopChat().reset()
  })

  it('shows the cards after the sentence that introduces them, not before', async () => {
    api.routes({ '/api/products/*': makeProduct({ id: 5 }) })
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(reply(
      'event: tool\ndata: {"name":"search_products","status":"running"}\n\n'
      + 'event: tool\ndata: {"name":"search_products","status":"done"}\n\n'
      + 'event: products\ndata: {"tool":"search_products","query":"powerbank","total":1,"products":[{"id":5}]}\n\n'
      + 'event: delta\ndata: {"text":"Βρήκα τα εξής powerbank."}\n\n'
      + 'event: delta\ndata: {"text":"\\n\\nΘέλεις να δεις κι άλλα;"}\n\n'
      + 'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n',
    ))))
    const wrapper = await mountSuspended(C, { route: false })

    await useShopChat().send('Δείξε μου powerbank')
    await vi.waitFor(() => expect(wrapper.find('li h4').exists()).toBe(true))

    const text = wrapper.text()
    expect(text.indexOf('Βρήκα τα εξής powerbank.')).toBeLessThan(text.indexOf('Προϊόν 5'))
    expect(text.indexOf('Προϊόν 5')).toBeLessThan(text.indexOf('Θέλεις να δεις κι άλλα;'))
  })
})
