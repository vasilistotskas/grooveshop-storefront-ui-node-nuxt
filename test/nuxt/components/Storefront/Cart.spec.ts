import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Cart from '~/components/Storefront/Cart.vue'
import WebsideCart from '~/components/variants/webside/Storefront/Cart.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart, makeFreeShippingProgress } from '~~/test/fixtures/cart'
import { failWith } from '~~/test/helpers/api'
import { setTenant, setTenantFeatures } from '~~/test/helpers/tenant'
import { trees } from '~~/test/helpers/trees'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The cart page: its lines (each with its own stock warning), the banners
 * above them, the summary beside them, emptying the cart behind a
 * confirmation, and the one-shot behaviours around it — GA4 `view_cart`,
 * the recovered-cart welcome, the payment-lookup toast. The line card,
 * the coupon field and the points line have their own specs and are
 * stand-ins here.
 */
const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const state = vi.hoisted(() => ({ query: {} as Record<string, string> }))
const { trackViewCart, toastAdd } = vi.hoisted(() => ({ trackViewCart: vi.fn(), toastAdd: vi.fn() }))

mockNuxtImport('useRoute', () => () => ({ name: 'cart___el', params: {}, query: state.query, path: '/cart', fullPath: '/cart', hash: '', meta: {}, matched: [] }))
mockNuxtImport('useGA4', () => () => ({ trackViewCart }))
mockNuxtImport('useToast', () => () => ({ add: toastAdd }))

mockComponent('CartItemCard', { props: ['cartItem'], template: '<div data-stub="item" :data-id="cartItem.id" />' })
mockComponent('CheckoutCouponInput', { template: '<div data-stub="coupon" />' })
mockComponent('CheckoutPointsEarned', { template: '<div data-stub="points" />' })
const suggestionsStub = {
  props: ['surface', 'seedIds'],
  template: `<div data-stub="suggestions" :data-surface="surface" :data-seeds="seedIds?.join(',') ?? 'none'" />`,
}
vi.mock('~/components/Product/Suggestions.vue', () => ({ default: suggestionsStub }))
vi.mock('~/components/variants/webside/Product/Suggestions.vue', () => ({ default: suggestionsStub }))

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Storefront/Cart.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el
const websideMessages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/variants/webside/Storefront/Cart.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el
const summaryMessages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Cart/Summary.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const words = (value: string) => value.replace(/\s+/g, '')
const euro = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

beforeEach(async () => {
  await useCartStore().cleanCartState()
  state.query = {}
  setTenant({ recommendationsEnabled: true })
  setTenantFeatures({ productSuggestions: false })
  clearNuxtData(['shipping:free-shipping-info', 'footer-pay-ways'])
  api.routes({ '/api/shipping/free-shipping-info': () => ({ providers: [], minThreshold: 50, maxThreshold: 50, currency: 'EUR', countryCode: 'GR' }) })
  useCartStore().cart = makeCart({
    items: [
      { id: 1, quantity: 1, product: { id: 1, price: 30, finalPrice: 30 } },
      { id: 2, quantity: 1, product: { id: 2, price: 40, finalPrice: 40 } },
    ],
  })
})

async function mountPage() {
  const wrapper = await mountSuspended(Cart, { route: false })
  await flushPromises()
  return wrapper
}

const itemIds = (wrapper: VueWrapper) => wrapper.findAll('[data-stub="item"]').map(item => item.attributes('data-id'))
const buttonByText = (root: ParentNode, label: string) =>
  [...root.querySelectorAll('button')].find(button => button.textContent?.trim() === label)

describe('Storefront/Cart', () => {
  it('draws the heading, the item count and one row per line in order', async () => {
    const wrapper = await mountPage()

    expect(wrapper.get('h1').text()).toBe(messages.title)
    expect(wrapper.text()).toContain('2 προϊόντα')
    expect(itemIds(wrapper)).toEqual(['1', '2'])
  })

  it('counts a single item in the singular', async () => {
    useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1 }] })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain('1 προϊόν')
    expect(wrapper.text()).not.toContain('1 προϊόντα')
  })

  it('shows the summary and a way back to the shop', async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain(summaryMessages.title)
    expect(wrapper.findAll('a').find(link => link.text() === messages.continue_shopping)!.attributes('href')).toBe('/products')
  })

  it('says an empty cart is empty, with no summary and a way to keep shopping', async () => {
    useCartStore().cart = makeCart({ items: [] })

    const wrapper = await mountPage()
    await vi.waitFor(() => expect(wrapper.text()).toContain(messages.empty.title))

    expect(wrapper.text()).not.toContain(summaryMessages.title)
    expect(itemIds(wrapper)).toEqual([])
  })

  it('shows neither lines nor "empty" while the cart is still loading', async () => {
    useCartStore().cart = null
    api.routes({ '/api/cart': () => new Promise(() => {}) })
    void useCartStore().setupCart()

    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain(messages.empty.title)
    expect(itemIds(wrapper)).toEqual([])
    expect(wrapper.text()).not.toContain(summaryMessages.title)
  })

  describe('delivery and offers', () => {
    it('says free delivery is unlocked in the banner and, on a phone, beside the count', async () => {
      useCartStore().cart = makeCart({
        items: [{ id: 1, quantity: 1, product: { price: 60, finalPrice: 60 } }],
        freeShippingProgress: makeFreeShippingProgress({ free: true, remainingAmount: null }),
      })

      const wrapper = await mountPage()
      await vi.waitFor(() => expect(wrapper.text()).toContain(`· ${messages.free_delivery_unlocked}`))

      expect(wrapper.text()).toContain('Δωρεάν μεταφορικά')
    })

    // Django decides free delivery (`freeShippingProgress.free`), on the
    // products after discounts, from a threshold or an offer; the page
    // never compares totals itself.
    it.each([
      { name: '0,02 € short of a threshold', progress: makeFreeShippingProgress({ remainingAmount: 0.02, threshold: 40 }), unlocked: false, banner: 'Δωρεάν μεταφορικά' },
      { name: 'a threshold reached', progress: makeFreeShippingProgress({ free: true, remainingAmount: null, threshold: 40 }), unlocked: true, banner: 'Η παραγγελία σου ξεπερνά' },
      { name: 'an offer waiving it', progress: makeFreeShippingProgress({ free: true, source: 'promotion', remainingAmount: null, threshold: null }), unlocked: true, banner: 'Μια προσφορά καλύπτει τα μεταφορικά σου.' },
    ])('says free delivery is unlocked as Django decides it: $name', async ({ progress, unlocked, banner }) => {
      useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1, product: { price: 1, finalPrice: 1 } }], freeShippingProgress: progress })

      const wrapper = await mountPage()
      await vi.waitFor(() => expect(wrapper.text()).toMatch(/μεταφορικ/))

      expect(wrapper.text().includes(`· ${messages.free_delivery_unlocked}`)).toBe(unlocked)
      // The banner above the lines agrees with it.
      expect(wrapper.text().includes(banner)).toBe(unlocked)
    })

    it('does not say it while the cart is short of free delivery', async () => {
      useCartStore().cart = makeCart({ freeShippingProgress: makeFreeShippingProgress() })

      const wrapper = await mountPage()

      expect(wrapper.text()).not.toContain(`· ${messages.free_delivery_unlocked}`)
    })

    it('nudges toward an offer the cart is short of', async () => {
      useCartStore().cart = makeCart({ promotionNearMiss: [{ promotionId: 4, name: 'POWER8', remainingAmount: 9.44, remainingQuantity: null, rewardProducts: [], freeShipping: false }] })

      const wrapper = await mountPage()

      expect(words(wrapper.text())).toContain(words(`${euro(9.44)}`))
      expect(wrapper.text()).toContain('POWER8')
    })
  })

  describe('stock', () => {
    it('warns on the line that has outgrown its stock, and on the page, and blocks nothing else', async () => {
      useCartStore().cart = makeCart({
        items: [
          { id: 1, quantity: 3, product: { id: 1, stock: 2 } },
          { id: 2, quantity: 1, product: { id: 2, stock: 10 } },
        ],
      })

      const wrapper = await mountPage()
      const rows = wrapper.findAll('ul > li')

      expect(wrapper.text()).toContain(messages.stock_alert.title)
      expect(rows[0]!.text()).toContain(messages.stock_status.limited_stock.replace('{available}', '2').replace('{requested}', '3'))
      expect(rows[1]!.text()).not.toContain(messages.stock_status.limited_title)
    })

    it('calls a sold-out line unavailable', async () => {
      useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1, product: { stock: 0 } }] })

      const wrapper = await mountPage()

      expect(wrapper.get('ul > li').text()).toContain(messages.stock_status.out_of_stock)
    })

    it('raises no alert for a cart that is all in stock', async () => {
      const wrapper = await mountPage()

      expect(wrapper.text()).not.toContain(messages.stock_alert.title)
    })
  })

  describe('analytics', () => {
    it('reports view_cart once, with the cart value and its lines', async () => {
      await mountPage()

      expect(trackViewCart).toHaveBeenCalledOnce()
      expect(trackViewCart).toHaveBeenCalledWith({
        currency: 'EUR',
        value: 70,
        items: [
          { item_id: '1', quantity: 1, price: 30 },
          { item_id: '2', quantity: 1, price: 40 },
        ],
      })

      useCartStore().cart = makeCart({ items: [{ id: 1, product: { id: 1 } }] })
      await flushPromises()

      expect(trackViewCart).toHaveBeenCalledOnce()
    })

    it('reports nothing for an empty cart', async () => {
      useCartStore().cart = makeCart({ items: [] })

      await mountPage()

      expect(trackViewCart).not.toHaveBeenCalled()
    })
  })

  describe('arriving from an email or a payment return', () => {
    it('welcomes a recovered cart back, then takes the flag out of the URL', async () => {
      state.query = { recovered: '1' }
      const replace = vi.spyOn(useRouter(), 'replace').mockResolvedValue(undefined)
      // The welcome appears when the cart arrives, and only then goes from the URL.
      const cart = useCartStore().cart
      useCartStore().cart = null

      const wrapper = await mountPage()
      useCartStore().cart = cart
      await flushPromises()

      expect(wrapper.text()).toContain(messages.recovered.title)
      expect(replace).toHaveBeenCalledWith({ query: { recovered: undefined } })
    })

    it('does not welcome back a recovered link whose cart is empty', async () => {
      state.query = { recovered: '1' }
      useCartStore().cart = makeCart({ items: [] })

      const wrapper = await mountPage()

      expect(wrapper.text()).not.toContain(messages.recovered.title)
    })

    it('does not welcome anyone who did not come from a recovery link', async () => {
      const wrapper = await mountPage()

      expect(wrapper.text()).not.toContain(messages.recovered.title)
    })

    it('tells the shopper the payment could not be looked up, then clears the flag', async () => {
      state.query = { paymentError: 'x' }
      const replace = vi.spyOn(useRouter(), 'replace').mockResolvedValue(undefined)

      await mountPage()

      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: messages.payment_lookup_failed_title, color: 'error' }))
      expect(replace).toHaveBeenCalledWith({ query: { paymentError: undefined } })
    })

    it('shows no payment toast without the flag', async () => {
      await mountPage()

      expect(toastAdd).not.toHaveBeenCalled()
    })
  })

  describe('emptying the cart', () => {
    const openConfirm = async (wrapper: VueWrapper) => {
      await wrapper.findAll('button').find(button => button.text() === messages.clear.cta)!.trigger('click')
      await flushPromises()
    }

    it('asks first and removes nothing until the shopper confirms', async () => {
      const wrapper = await mountPage()

      await openConfirm(wrapper)

      expect(buttonByText(document.body, messages.clear.confirm)).toBeTruthy()
      expect(api.callsTo('/api/cart')).toEqual([])
      expect(itemIds(wrapper)).toHaveLength(2)
    })

    it('empties the cart through the API once confirmed', async () => {
      api.routes({ '/api/shipping/free-shipping-info': () => ({ minThreshold: 50 }), '/api/cart': () => ({}) })
      const wrapper = await mountPage()
      await openConfirm(wrapper)

      buttonByText(document.body, messages.clear.confirm)!.click()
      await flushPromises()

      expect(api.callsTo('/api/cart')).toEqual([{ url: '/api/cart', options: expect.objectContaining({ method: 'DELETE' }) }])
      await vi.waitFor(() => expect(wrapper.text()).toContain(messages.empty.title))
    })

    it('keeps the cart and says so when emptying fails', async () => {
      api.routes({ '/api/shipping/free-shipping-info': () => ({ minThreshold: 50 }), '/api/cart': failWith(502) })
      const wrapper = await mountPage()
      await openConfirm(wrapper)

      buttonByText(document.body, messages.clear.confirm)!.click()
      await flushPromises()

      expect(toastAdd).toHaveBeenCalledWith(expect.objectContaining({ title: messages.clear.error_title, color: 'error' }))
      expect(itemIds(wrapper)).toHaveLength(2)
    })
  })

  describe('you might also need', () => {
    it('shows the strip, seeded with the product ids of the cart lines, when the store has the feature', async () => {
      setTenantFeatures({ productSuggestions: true })
      useCartStore().cart = makeCart({ items: [{ id: 1, product: { id: 9 } }, { id: 2, product: { id: 4 } }] })

      const wrapper = await mountPage()
      await vi.waitFor(() => expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(true))
      expect(wrapper.find('[data-stub="suggestions"]').attributes()).toMatchObject({ 'data-surface': 'cart', 'data-seeds': '9,4' })
    })

    it('shows nothing without the productSuggestions feature, plan flag on', async () => {
      useCartStore().cart = makeCart({ items: [{ id: 1, product: { id: 9 } }] })

      const wrapper = await mountPage()

      expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(false)
    })

    it('fills an empty cart with the store-wide empty_cart strip, which fetches its own', async () => {
      setTenantFeatures({ productSuggestions: true })
      useCartStore().cart = makeCart({ items: [] })

      const wrapper = await mountPage()

      await vi.waitFor(() => expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(true))
      const strip = wrapper.get('[data-stub="suggestions"]')
      expect(strip.attributes('data-surface')).toBe('empty_cart')
      expect(strip.attributes('data-seeds')).toBe('none')
      expect(wrapper.text()).toContain(messages.empty.title)
    })

    it('shows no empty-cart strip without the productSuggestions feature', async () => {
      useCartStore().cart = makeCart({ items: [] })

      const wrapper = await mountPage()
      await vi.waitFor(() => expect(wrapper.text()).toContain(messages.empty.title))

      expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(false)
    })

    it('shows no empty-cart strip while the cart is still loading', async () => {
      setTenantFeatures({ productSuggestions: true })
      useCartStore().cart = null
      api.routes({ '/api/cart': () => new Promise(() => {}) })
      void useCartStore().setupCart()

      const wrapper = await mountPage()

      expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(false)
    })
  })
})

/**
 * The webside cart shows the same free-delivery notice, fed the cart's
 * `freeShippingProgress`: Django's distance, never one it computes.
 */
describe('Storefront/Cart (webside)', () => {
  // Both trees decide from the productSuggestions feature.
  const showSuggestions = (on: boolean) => {
    clearNuxtData()
    setTenantFeatures({ productSuggestions: on })
  }
  const mountWebside = async () => {
    const wrapper = await mountSuspended(WebsideCart, { route: false })
    await flushPromises()
    return wrapper
  }

  it('fills an empty cart with the store-wide empty_cart strip', async () => {
    showSuggestions(true)
    useCartStore().cart = makeCart({ items: [] })

    const wrapper = await mountWebside()

    await vi.waitFor(() => expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(true))
    expect(wrapper.get('[data-stub="suggestions"]').attributes('data-surface')).toBe('empty_cart')
  })

  it('shows no empty-cart strip while the store has suggestions off', async () => {
    showSuggestions(false)
    useCartStore().cart = makeCart({ items: [] })

    const wrapper = await mountWebside()
    await vi.waitFor(() => expect(wrapper.text()).toContain('Το καλάθι σου είναι άδειο'))

    expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(false)
  })

  it('keeps the cross-sell strip, not the empty-cart one, on a cart with lines', async () => {
    showSuggestions(true)
    useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1 }] })

    const wrapper = await mountWebside()

    await vi.waitFor(() => expect(wrapper.find('[data-stub="suggestions"]').exists()).toBe(true))
    expect(wrapper.findAll('[data-stub="suggestions"]').map(s => s.attributes('data-surface'))).toEqual(['cart'])
  })

  it.each([
    { name: '0,02 € short', progress: makeFreeShippingProgress({ remainingAmount: 0.02, threshold: 40 }), notice: () => `Πρόσθεσε ακόμα ${euro(0.02)} για δωρεάν μεταφορικά` },
    { name: 'free', progress: makeFreeShippingProgress({ free: true, remainingAmount: null, threshold: 40 }), notice: () => 'Έχεις δωρεάν μεταφορικά' },
    { name: '2 items short of an offer', progress: makeFreeShippingProgress({ source: 'promotion', remainingAmount: null, remainingQuantity: 2, threshold: null }), notice: () => 'Πρόσθεσε ακόμα 2 τεμάχια για δωρεάν μεταφορικά' },
  ])('tells the cart\'s free-delivery progress: $name', async ({ progress, notice }) => {
    useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1, product: { price: 1, finalPrice: 1 } }], freeShippingProgress: progress })

    const wrapper = await mountSuspended(WebsideCart, { route: false })
    await flushPromises()

    await vi.waitFor(() => expect(wrapper.text()).toContain(notice()))
  })

  describe('the teasers for an offer the cart is just short of', () => {
    const protector: PromotionProductRef = { id: 34, name: 'Τζαμάκι οθόνης', slug: 'tzamaki', mainImagePath: '' }
    const glass: PromotionProductRef = { id: 35, name: 'Τζαμάκι privacy', slug: 'privacy', mainImagePath: '' }
    const forms = (key: string): [string, string] => websideMessages[key].split('|').map((form: string) => form.trim())

    it('says how many euros more', async () => {
      useCartStore().cart = makeCart({ promotionNearMiss: [{ promotionId: 4, name: 'POWER8', remainingAmount: 9.44, remainingQuantity: null, rewardProducts: [], freeShipping: false }] })

      const wrapper = await mountWebside()

      expect(words(wrapper.text())).toContain(words(websideMessages.near_miss.replace('{amount}', euro(9.44)).replace('{name}', 'POWER8')))
    })

    it('says how many more items, in the singular and the plural', async () => {
      const [one, many] = forms('near_miss_quantity')
      useCartStore().cart = makeCart({
        promotionNearMiss: [
          { promotionId: 3, name: '2+1', remainingAmount: null, remainingQuantity: 1, rewardProducts: [], freeShipping: false },
          { promotionId: 4, name: '-5%', remainingAmount: null, remainingQuantity: 2, rewardProducts: [], freeShipping: false },
        ],
      })

      const wrapper = await mountWebside()

      const text = words(wrapper.text())
      expect(text).toContain(words(one.replace('{count}', '1').replace('{name}', '2+1')))
      expect(text).toContain(words(many.replace('{count}', '2').replace('{name}', '-5%')))
    })

    it('names the rewards to add, linked, when what is missing is the offers reward', async () => {
      const [one, many] = forms('near_miss_reward')
      useCartStore().cart = makeCart({
        promotionNearMiss: [
          { promotionId: 7, name: 'Θήκη + τζαμάκι -50%', remainingAmount: null, remainingQuantity: 1, rewardProducts: [protector], freeShipping: false },
          { promotionId: 8, name: 'Δεύτερο τζαμάκι', remainingAmount: null, remainingQuantity: 1, rewardProducts: [protector, glass], freeShipping: false },
        ],
      })

      const wrapper = await mountWebside()

      const text = words(wrapper.text())
      expect(text).toContain(words(one.replace('{name}', 'Θήκη + τζαμάκι -50%')))
      expect(text).toContain(words(many.replace('{name}', 'Δεύτερο τζαμάκι')))
      expect(wrapper.findAll('a').map(link => link.attributes('href')).filter(href => /tzamaki$|privacy$/.test(href ?? '')))
        .toEqual(['/products/34/tzamaki', '/products/34/tzamaki', '/products/35/privacy'])
    })

    it('lists at most three reward products per teaser', async () => {
      const rewards: PromotionProductRef[] = [1, 2, 3, 4].map(id => ({ id, name: `Τζαμάκι ${id}`, slug: `tzamaki-${id}`, mainImagePath: '' }))
      useCartStore().cart = makeCart({ promotionNearMiss: [{ promotionId: 7, name: 'Offer', remainingAmount: null, remainingQuantity: 1, rewardProducts: rewards, freeShipping: false }] })

      const wrapper = await mountWebside()

      expect(wrapper.findAll('a').map(link => link.attributes('href')).filter(href => /tzamaki-\d$/.test(href ?? '')))
        .toEqual(['/products/1/tzamaki-1', '/products/2/tzamaki-2', '/products/3/tzamaki-3'])
    })
  })
})

/**
 * Staging webside, 2026-10-28, a cart of one 19,99 € item: the teaser of
 * a free-shipping offer from 39 € said "add 19,01 €" while the store's
 * free-delivery line said "add 30,01 €" (its carrier's 50 € threshold).
 * Django now sends ONE distance, `freeShippingProgress`, and flags the
 * offer's teaser `freeShipping`: every design tells free delivery once,
 * with Django's amount, and still tells the other offers.
 */
describe.each(trees(Cart, WebsideCart))('$tree Storefront/Cart: one free-delivery message', ({ C }) => {
  const OFFER = 'Δωρεάν αποστολή από 39€'

  beforeEach(() => {
    useCartStore().cart = makeCart({
      items: [{ id: 1, quantity: 1, product: { price: 19.99, finalPrice: 19.99 } }],
      freeShippingProgress: makeFreeShippingProgress({ source: 'promotion', remainingAmount: 19.01, threshold: 39 }),
      promotionNearMiss: [
        { promotionId: 1, name: OFFER, remainingAmount: 19.01, remainingQuantity: null, rewardProducts: [], freeShipping: true },
        { promotionId: 2, name: 'POWER8', remainingAmount: 9.44, remainingQuantity: null, rewardProducts: [], freeShipping: false },
      ],
    })
  })

  const mount = async () => {
    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()
    await vi.waitFor(() => expect(wrapper.text()).toMatch(/μεταφορικ/))
    return wrapper
  }

  it('tells free delivery once, with the distance Django sent', async () => {
    const wrapper = await mount()
    const text = words(wrapper.text())

    expect(text.split(words(euro(19.01))).length - 1).toBe(1)
    expect(wrapper.text().match(/για δωρεάν μεταφορικά/g)).toHaveLength(1)
    // Not the store's own 50 € threshold, which free-shipping-info carries.
    expect(text).not.toContain(words(euro(30.01)))
    expect(text).not.toContain(words(euro(50)))
  })

  it('does not tell the free-shipping offer again as a teaser', async () => {
    const wrapper = await mount()

    expect(wrapper.text()).not.toContain(OFFER)
  })

  it('still tells every other offer the cart is short of', async () => {
    const wrapper = await mount()

    expect(wrapper.text()).toContain('POWER8')
    expect(words(wrapper.text())).toContain(words(euro(9.44)))
  })

  it('tells nothing of free delivery when the cart has no route to it', async () => {
    useCartStore().cart = makeCart({ freeShippingProgress: null })

    const wrapper = await mountSuspended(C, { route: false })
    await flushPromises()

    expect(wrapper.text()).not.toMatch(/δωρεάν μεταφορικά/i)
  })
})
