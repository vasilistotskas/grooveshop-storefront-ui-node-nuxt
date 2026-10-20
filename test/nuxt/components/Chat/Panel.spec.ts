import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import ChatPanel from '~/components/Chat/Panel.vue'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

/**
 * The webside assistant's conversation. `useShopChat` is the app's real
 * one; the gateway's `/chat` stream is the stubbed `fetch`.
 */
const encoder = new TextEncoder()

const reply = (body: string) => new Response(encoder.encode(body), { status: 200 })

const bodyOf = (call: [string, RequestInit]) => JSON.parse(call[1].body as string)

const own = (wrapper: VueWrapper, key: string) =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(b => b.text() === label)

const mountPanel = () => mountSuspended(ChatPanel, { route: false })

describe('Chat/Panel', () => {
  beforeEach(() => {
    useShopChat().reset()
  })

  it('marks a failed step as failed', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(reply(
      'event: tool\ndata: {"name":"add_to_cart","status":"running"}\n\n'
      + 'event: tool\ndata: {"name":"add_to_cart","status":"error"}\n\n'
      + 'event: delta\ndata: {"text":"Υπάρχουν μόνο 2."}\n\n'
      + 'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n',
    ))))
    const wrapper = await mountPanel()

    await useShopChat().send('βάλε 5')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Υπάρχουν μόνο 2.'))

    expect(wrapper.text()).toContain(own(wrapper, 'chat.tools.failed'))
  })

  it('offers to send a failed message again, and sends it with its turn id', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(reply('event: error\ndata: {"message":"Η συνομιλία διακόπηκε."}\n\n'))
      .mockResolvedValueOnce(reply(
        'event: delta\ndata: {"text":"Έγινε."}\n\n'
        + 'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n',
      ))
    vi.stubGlobal('fetch', fetchMock)
    const wrapper = await mountPanel()

    await useShopChat().send('βάλε το στο καλάθι')
    await vi.waitFor(() => expect(button(wrapper, own(wrapper, 'chat.retry'))?.text()).toBe(own(wrapper, 'chat.retry')))
    await button(wrapper, own(wrapper, 'chat.retry'))!.trigger('click')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Έγινε.'))

    const [first, second] = fetchMock.mock.calls.map(c => bodyOf(c as [string, RequestInit]))
    expect(second.turnId).toBe(first.turnId)
    expect(button(wrapper, own(wrapper, 'chat.retry'))).toBeUndefined()
  })

  it('offers only a new conversation once the conversation is over', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(
      JSON.stringify({ error: 'finished' }), { status: 409 },
    ))))
    const wrapper = await mountPanel()

    await useShopChat().send('γεια')
    await vi.waitFor(() => expect(wrapper.text()).toContain(useNuxtApp().$i18n.t('chat.error.conversationFull')))

    expect(button(wrapper, own(wrapper, 'chat.retry'))).toBeUndefined()
  })
})
