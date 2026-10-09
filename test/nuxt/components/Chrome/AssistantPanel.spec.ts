import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import type { VueWrapper } from '@vue/test-utils'
import AssistantPanel from '~/components/Chrome/AssistantPanel.vue'
import { makeProduct } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)

/**
 * The assistant's conversation. `useShopChat` is the app's real one; the
 * gateway's `/chat` stream is the stubbed `fetch`.
 */
const encoder = new TextEncoder()

function stubReply(body: string) {
  const fetchMock = vi.fn((_url: string, _init: RequestInit) =>
    Promise.resolve(new Response(encoder.encode(body), { status: 200 })),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const bodyOf = (call: [string, RequestInit]) => JSON.parse(call[1].body as string)

const own = (wrapper: VueWrapper, key: string) =>
  (wrapper.vm as unknown as { t: (k: string) => string }).t(key)

const button = (wrapper: VueWrapper, label: string) =>
  wrapper.findAll('button').find(b => b.text() === label)

const mountPanel = () => mountSuspended(AssistantPanel, { route: false })

describe('Chrome/AssistantPanel', () => {
  beforeEach(() => {
    useShopChat().reset()
  })

  it('greets a first-time visitor and offers quick questions that send themselves', async () => {
    const fetchMock = stubReply('event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n')
    const wrapper = await mountPanel()

    expect(wrapper.text()).toContain(own(wrapper, 'welcome.title'))
    await button(wrapper, own(wrapper, 'suggestions.gift'))!.trigger('click')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    expect(bodyOf(fetchMock.mock.calls[0]!).message).toBe(own(wrapper, 'suggestions.gift'))
  })

  it('shows the shopper words and the assistant reply, without product cards', async () => {
    stubReply(
      'event: delta\ndata: {"text":"Ναι, το έχουμε."}\n\n'
      + 'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n',
    )
    const wrapper = await mountPanel()

    await useShopChat().send('Έχετε φορτιστή;')
    await vi.waitFor(() => expect(wrapper.text()).toContain('Ναι, το έχουμε.'))

    expect(wrapper.text()).toContain('Έχετε φορτιστή;')
    expect(wrapper.find('img').exists()).toBe(false)
  })

  it('renders the products a tool surfaced between the words around them, from the product API', async () => {
    api.routes({ '/api/products/*': makeProduct({ id: 5 }) })
    stubReply(
      'event: delta\ndata: {"text":"Ψάχνω φορτιστές."}\n\n'
      + 'event: products\ndata: {"tool":"search_products","query":"φορτιστής","total":1,"products":[{"id":5}]}\n\n'
      + 'event: delta\ndata: {"text":" Βρήκα έναν."}\n\n'
      + 'event: done\ndata: {"conversationId":"c1","cartMutated":false}\n\n',
    )
    const wrapper = await mountPanel()

    await useShopChat().send('Έχετε φορτιστή;')
    await vi.waitFor(() => expect(wrapper.find('li h4').exists()).toBe(true))

    const text = wrapper.text()
    expect(wrapper.find('li h4').text()).toBe('Προϊόν 5')
    expect(text.indexOf('Ψάχνω φορτιστές.')).toBeLessThan(text.indexOf('Προϊόν 5'))
    expect(text.indexOf('Προϊόν 5')).toBeLessThan(text.indexOf('Βρήκα έναν.'))
    expect(api.callsTo('/api/products/*').map(call => call.url)).toEqual(['/api/products/5'])
  })

  it('says a cart-changing turn updated the cart and links to it', async () => {
    stubReply('event: done\ndata: {"conversationId":"c1","cartId":"abc","cartMutated":true}\n\n')
    const wrapper = await mountPanel()
    useCartStore().refreshCart = vi.fn(() => Promise.resolve())

    await useShopChat().send('βάλε το στο καλάθι')
    await vi.waitFor(() => expect(wrapper.text()).toContain(own(wrapper, 'cartUpdated')))

    expect(wrapper.find('a[href="/cart"]').text()).toBe(own(wrapper, 'viewCart'))
  })

  it('does not claim the assistant never places orders', async () => {
    const wrapper = await mountPanel()

    // The gateway maps `complete_checkout`, so the disclaimer must tell
    // the shopper to check the order, not that none is placed.
    expect(wrapper.html()).not.toMatch(/never place|δεν κάνει παραγγελ/i)
    expect(wrapper.text()).toContain(own(wrapper, 'disclaimer'))
  })

  it('asks the parent to close it', async () => {
    const wrapper = await mountPanel()

    await wrapper.find(`button[aria-label="${own(wrapper, 'close')}"]`).trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
