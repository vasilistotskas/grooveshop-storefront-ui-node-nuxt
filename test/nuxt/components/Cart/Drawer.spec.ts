import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, mockNuxtImport, mockComponent } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { reactive } from 'vue'
import { resolve } from 'node:path'
import YAML from 'yaml'
import Drawer from '~/components/Cart/Drawer.vue'
import { useCartStore } from '~/stores/cart'
import { makeCart } from '~~/test/fixtures/cart'
import { makeProduct } from '~~/test/fixtures/product'
import { setTenant } from '~~/test/helpers/tenant'
import { REPO, parseSfc } from '~~/test/helpers/sourceText'

/**
 * The cart drawer: a slideover on a desktop, a bottom sheet on a phone;
 * the line an add just put in, the lines as compact rows, at most two
 * suggestions when the plan and the store both allow them, and the
 * subtotal after offers — saying which offers — with "View cart" and
 * "Checkout". It closes when the shopper navigates away.
 */
const state = vi.hoisted(() => ({ desktop: true, suggestions: true }))
const route = vi.hoisted(() => ({ value: null as unknown as { fullPath: string } }))

mockNuxtImport('useMediaQuery', () => () => ref(state.desktop))
mockNuxtImport('useSettingFlag', () => (key: string) => computed(() => key === 'PRODUCT_SUGGESTIONS_ENABLED' && state.suggestions))
mockNuxtImport('useRoute', () => () => route.value)
mockNuxtImport('useFreeShippingInfo', () => () => ({ data: ref({ minThreshold: 50 }), pending: ref(false), error: ref(null) }))
// The line row and the add button have their own specs.
mockComponent('CartItemCard', { props: { cartItem: Object, compact: Boolean }, template: '<div data-row :data-compact="compact">{{ cartItem.id }}</div>' })
mockComponent('ButtonProductAddToCart', { props: ['product', 'text'], template: '<button data-add>{{ text }}</button>' })

const messages = YAML.parse(
  parseSfc(resolve(REPO, 'app/components/Cart/Drawer.vue')).customBlocks.find(block => block.type === 'i18n')!.content,
).el

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

beforeEach(() => {
  state.desktop = true
  state.suggestions = true
  route.value = reactive({ fullPath: '/products' })
  setTenant({ recommendationsEnabled: true })
  const store = useCartStore()
  store.cart = makeCart({ items: [{ id: 1, quantity: 1, product: { id: 1, price: 40, vatPercent: 0 } }, { id: 2, quantity: 2, product: { id: 2, price: 10, vatPercent: 0 } }] })
  store.loaded = true
  useCartDrawer().show()
})

async function mountDrawer() {
  const wrapper = await mountSuspended(Drawer, { route: false })
  await flushPromises()
  return wrapper
}

/** The open panel is teleported to the body. */
const panel = () => document.body.querySelector('[role="dialog"]') as HTMLElement
const text = () => panel().textContent ?? ''
const link = (label: string) => [...panel().querySelectorAll('a')].find(anchor => anchor.textContent?.trim() === label)

describe('Cart/Drawer', () => {
  it('slides in from the side on a desktop and from the bottom on a phone', async () => {
    const desktop: VueWrapper = await mountDrawer()
    expect(desktop.findComponent({ name: 'USlideover' }).exists()).toBe(true)
    desktop.unmount()

    state.desktop = false
    const phone = await mountDrawer()
    expect(phone.findComponent({ name: 'UDrawer' }).exists()).toBe(true)
  })

  it('lists every line as a compact row, with the count beside the title', async () => {
    await mountDrawer()

    expect([...panel().querySelectorAll('[data-row]')].map(row => [row.textContent, row.getAttribute('data-compact')])).toEqual([['1', 'true'], ['2', 'true']])
    expect(panel().querySelector('h2')!.textContent).toBe('Καλάθι, 3 προϊόντα')
    expect(panel().querySelector('p[aria-hidden="true"]')!.textContent).toMatch(/Καλάθι\s*3/)
  })

  it('names the line an add just put in, and nothing when the header opened it', async () => {
    useCartDrawer().show('Καλώδιο USB-C')
    await mountDrawer()

    expect(text()).toContain('Προστέθηκε: Καλώδιο USB-C')

    useCartDrawer().show()
    await flushPromises()
    expect(text()).not.toContain('Προστέθηκε:')
  })

  it('totals the lines after the offers and leads on to the cart and checkout', async () => {
    useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1, product: { id: 1, price: 100, vatPercent: 0 } }], promotionDiscount: 20 })
    await mountDrawer()

    expect(text()).toContain(money(80))
    expect(link(messages.view_cart)!.getAttribute('href')).toBe('/cart')
    expect(link(messages.checkout)!.getAttribute('href')).toBe('/checkout')
  })

  it.each([
    ['a code and a gift', { appliedCouponCodes: ['GAN20'], promotionGiftItems: [{ productName: 'Καλώδιο' }], promotionDiscount: 5 }, 'Εφαρμόστηκαν το κουπόνι GAN20 και το δώρο'],
    ['a code', { appliedCouponCodes: ['GAN20'], promotionDiscount: 5 }, 'Εφαρμόστηκε το κουπόνι GAN20'],
    ['a gift', { promotionGiftItems: [{ productName: 'Καλώδιο' }] }, messages.applied.gift],
    ['an automatic offer', { promotionDiscount: 5 }, messages.applied.offers],
  ])('says which offers the subtotal includes: %s', async (_case, overrides, note) => {
    useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1, product: { id: 1, price: 100, vatPercent: 0 } }], ...overrides })

    await mountDrawer()

    expect(text()).toContain(note)
  })

  it('suggests at most two of the cart\'s recommendations', async () => {
    useCartStore().cart = makeCart({
      items: [{ id: 1, quantity: 1, product: { id: 1, price: 10, vatPercent: 0 } }],
      recommendations: [makeProduct({ id: 7 }), makeProduct({ id: 8 }), makeProduct({ id: 9 })],
    })

    await mountDrawer()

    expect(text()).toContain(messages.finishing_touch)
    expect([...panel().querySelectorAll('[data-add]')].map(button => button.textContent)).toEqual([
      'Προσθήκη του «Προϊόν 7» στο καλάθι',
      'Προσθήκη του «Προϊόν 8» στο καλάθι',
    ])
  })

  it.each([
    ['the store switched suggestions off', () => { state.suggestions = false }],
    ['the plan has no recommendations', () => setTenant({ recommendationsEnabled: false })],
  ])('suggests nothing when %s', async (_case, switchOff) => {
    useCartStore().cart = makeCart({ items: [{ id: 1, quantity: 1, product: { id: 1, price: 10, vatPercent: 0 } }], recommendations: [makeProduct({ id: 7 })] })
    switchOff()

    await mountDrawer()

    expect(text()).not.toContain(messages.finishing_touch)
  })

  it('says an empty cart is empty, with no checkout', async () => {
    useCartStore().cart = makeCart({ items: [] })

    await mountDrawer()

    expect(text()).toContain(messages.empty)
    expect(link(messages.continue)!.getAttribute('href')).toBe('/products')
    expect(link(messages.checkout)).toBeUndefined()
  })

  it('closes when the shopper navigates', async () => {
    await mountDrawer()

    route.value.fullPath = '/cart'
    await flushPromises()

    expect(useCartDrawer().open.value).toBe(false)
  })
})
