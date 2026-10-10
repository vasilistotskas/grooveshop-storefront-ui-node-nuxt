import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import ProductCards from '~/components/Chrome/AssistantProducts.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeProduct } from '~~/test/fixtures/product'
import { failWith } from '~~/test/helpers/api'

/**
 * The cards under an assistant reply. The `products` event names ids and
 * nothing else; every card is loaded through the storefront's product API,
 * so the number it prints is the shopper's, never the assistant's.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
const b2bPrice = vi.hoisted(() => vi.fn((_id: number): { finalPrice: string } | undefined => undefined))

mockNuxtImport('$api', () => api)
mockNuxtImport('useToast', () => () => ({ add: vi.fn(), remove: vi.fn(), update: vi.fn(), clear: vi.fn() }))
mockNuxtImport('useB2BPricing', () => () => ({ register: vi.fn(), priceFor: b2bPrice }))

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')
type Wrapper = Awaited<ReturnType<typeof mountCards>>

/** The component's own copy: its `<i18n>` block is not in the global messages. */
const own = (wrapper: Wrapper, key: string, params: Record<string, unknown> = {}, plural?: number) =>
  (wrapper.vm as unknown as { t: (k: string, p: Record<string, unknown>, n?: number) => string }).t(key, params, plural)

/** Answer `/api/products/:id` from `byId`; an id not listed is a 404. */
function catalogue(byId: Record<number, ReturnType<typeof makeProduct>>) {
  api.routes({
    '/api/products/*': (url: string) => {
      const id = Number(url.split('/').pop())
      const product = byId[id]
      if (!product) failWith(404)()
      return product
    },
  })
}

const mountCards = (event: Partial<ShopChatProducts> = {}) =>
  mountSuspended(ProductCards, {
    route: false,
    props: { event: { tool: 'search_products', ids: [1, 2], at: 0, ...event } },
  })

describe('Chrome/AssistantProducts', () => {
  beforeEach(async () => {
    await useCartStore().cleanCartState()
    const cart = makeCart({ items: [] })
    useCartStore().cart = cart
    api.routes({ '/api/cart': cart })
    b2bPrice.mockReset()
  })

  it('prints the price the product API returns, in the order of the ids', async () => {
    catalogue({
      1: makeProduct({ id: 1, price: 100 }),
      2: makeProduct({ id: 2, price: 50 }),
    })

    const wrapper = await mountCards({ ids: [2, 1] })
    await vi.waitFor(() => expect(wrapper.findAll('li h4')).toHaveLength(2))

    expect(wrapper.findAll('li h4').map(h => h.text())).toEqual(['Προϊόν 2', 'Προϊόν 1'])
    expect(wrapper.text()).toContain(money(62))
    expect(wrapper.text()).toContain(money(124))
    expect(api.callsTo('/api/products/*').map(call => call.url).sort()).toEqual(['/api/products/1', '/api/products/2'])
  })

  it('shows the shopper their wholesale price and strikes the retail one', async () => {
    catalogue({ 1: makeProduct({ id: 1, price: 100 }) })
    b2bPrice.mockImplementation(id => (id === 1 ? { finalPrice: '90.00' } : undefined))

    const wrapper = await mountCards({ ids: [1] })
    await vi.waitFor(() => expect(wrapper.find('li h4').exists()).toBe(true))

    expect(wrapper.find('li .line-through').text()).toBe(money(124))
    expect(wrapper.text()).toContain(money(90))
  })

  it('drops a product that is gone or inactive without a trace', async () => {
    catalogue({
      1: makeProduct({ id: 1 }),
      3: makeProduct({ id: 3, active: false }),
    })

    const wrapper = await mountCards({ ids: [1, 2, 3] })
    await vi.waitFor(() => expect(wrapper.findAll('li h4')).toHaveLength(1))

    expect(wrapper.find('li h4').text()).toBe('Προϊόν 1')
    expect(wrapper.find('[aria-busy]').exists()).toBe(false)
  })

  it('renders nothing when no product can be shown and there is no search to summarise', async () => {
    catalogue({})

    const wrapper = await mountCards({ tool: 'get_product', ids: [9] })
    await flushPromises()

    expect(wrapper.find('section').exists()).toBe(false)
  })

  it('shows a skeleton per product until they load', async () => {
    api.routes({ '/api/products/*': () => new Promise(() => {}) })

    const wrapper = await mountCards({ ids: [1, 2, 3] })

    expect(wrapper.find('ul[aria-busy="true"]').findAll('li')).toHaveLength(3)
  })

  it('adds a card product to the cart, one unit', async () => {
    catalogue({ 1: makeProduct({ id: 1 }) })
    const wrapper = await mountCards({ ids: [1] })
    await vi.waitFor(() => expect(wrapper.find('li button').exists()).toBe(true))

    await wrapper.find('li button').trigger('click')
    await flushPromises()

    expect(api.callsTo('/api/cart/items')).toEqual([
      { url: '/api/cart/items', options: expect.objectContaining({ method: 'POST', body: { product: 1, quantity: 1 } }) },
    ])
  })

  it('links each card to its product page', async () => {
    catalogue({ 1: makeProduct({ id: 1 }) })
    const wrapper = await mountCards({ ids: [1] })
    await vi.waitFor(() => expect(wrapper.find('li a').exists()).toBe(true))

    expect(wrapper.find('li a').attributes('href')).toBe('/products/1/product-1')
  })

  it('says how many a search found and links to all of them', async () => {
    catalogue({ 1: makeProduct({ id: 1 }) })

    const wrapper = await mountCards({ ids: [1], total: 14, query: 'καφετιέρα' })
    await flushPromises()

    expect(wrapper.text()).toContain(own(wrapper, 'found', { count: 14 }, 14))
    const link = wrapper.findAll('a').find(a => a.text() === own(wrapper, 'view_all'))
    expect(link?.attributes('href')).toBe(`/search?query=${encodeURIComponent('καφετιέρα')}`)
  })

  it('reports an empty search and offers no link to it', async () => {
    catalogue({})

    const wrapper = await mountCards({ ids: [], total: 0, query: 'xyz' })
    await flushPromises()

    expect(wrapper.text()).toContain(own(wrapper, 'found', { count: 0 }, 0))
    expect(wrapper.findAll('a')).toHaveLength(0)
  })

  it('asks the panel to close when a card or View all is followed', async () => {
    catalogue({ 1: makeProduct({ id: 1 }) })
    const wrapper = await mountCards({ ids: [1], total: 1, query: 'a' })
    await vi.waitFor(() => expect(wrapper.find('li a').exists()).toBe(true))

    await wrapper.find('li a').trigger('click')
    await wrapper.findAll('a').find(a => a.text() === own(wrapper, 'view_all'))!.trigger('click')

    expect(wrapper.emitted('navigate')).toHaveLength(2)
  })
})
