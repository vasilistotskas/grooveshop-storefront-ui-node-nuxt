import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { computed } from 'vue'
import { mountSuspended, mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { Product } from '~~/shared/openapi/types.gen'
import ProductCard from '~/components/Product/Card.vue'
import { makeProduct } from '~~/test/fixtures/product'

/**
 * The default tree's card only: the frozen webside card is a different
 * component (447 lines of diff), pinned by its frozen-render snapshot.
 */

const { b2bPrice, flags } = vi.hoisted(() => ({
  b2bPrice: vi.fn((_id: number): { finalPrice: string } | undefined => undefined),
  flags: {} as Record<string, boolean>,
}))
mockNuxtImport('useB2BPricing', () => () => ({ register: vi.fn(), priceFor: b2bPrice }))
mockNuxtImport('useSettingFlag', () => (key: string, options: { fallback: boolean }) =>
  computed(() => flags[key] ?? options.fallback))

/** `makeProduct`'s `createdAt` is 2026-01-01; "now" is ten days later. */
const NOW = new Date('2026-01-11T00:00:00Z')

const mountCard = (product: Product) =>
  mountSuspended(ProductCard, {
    props: { product },
    global: { stubs: { ImgWithFallback: true, ButtonProductAddToCart: true } },
    route: false,
  })

/** The badge on the photograph, as a shopper reads it: its words and its paint. */
const badgeOf = async (product: Product) => {
  const wrapper = await mountCard(product)
  const badge = wrapper.findComponent({ name: 'UBadge' })
  if (!badge.exists()) return undefined
  const classes = badge.classes()
  const paint = classes.includes('bg-volt') ? 'volt' : `${badge.props('color')}-${badge.props('variant')}`
  return { label: badge.text(), paint }
}

const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

/**
 * The prices the card prints, in reading order: the price paid first,
 * then the struck-through one if there is one. Found by their money text
 * rather than by a type-scale class.
 */
function pricesOf(wrapper: Awaited<ReturnType<typeof mountCard>>): string[] {
  return wrapper.findAll('span')
    .filter(span => span.element.children.length === 0 && /\d\s*€$/.test(span.text()))
    .map(span => span.text())
}

describe('Product/Card', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(NOW)
    for (const key of Object.keys(flags)) Reflect.deleteProperty(flags, key)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // One badge, most urgent first: cannot buy it, cheaper than usual,
  // new. Every product below is also new (ten days old).
  it.each([
    ['sold out beats everything', { stock: 0, discountPercent: 20 }, { label: 'Εξαντλήθηκε', paint: 'neutral-soft' }],
    ['a discount beats newness, in volt', { stock: 50, discountPercent: 12.6 }, { label: '−13%', paint: 'volt' }],
    ['a new product says so in ink', { stock: 50 }, { label: 'Νέο', paint: 'primary-solid' }],
  ])('badge: %s', async (_case, overrides, expected) => {
    expect(await badgeOf(makeProduct(overrides))).toEqual(expected)
  })

  it('shows no badge on an ordinary product older than three weeks', async () => {
    const product = makeProduct({ stock: 50, createdAt: '2025-12-20T23:59:59Z' })

    expect(await badgeOf(product)).toBeUndefined()
  })

  it.each([
    ['at the product\'s own threshold', { stock: 5, lowStockThreshold: 5 }, 'Μόνο 5 απέμειναν'],
    ['up to 10 left when the product sets no threshold', { stock: 10, lowStockThreshold: 0 }, 'Μόνο 10 απέμειναν'],
    ['one left, in the singular', { stock: 1, lowStockThreshold: 0 }, 'Μόνο 1 απέμεινε'],
  ])('says how few are left under the price %s', async (_case, overrides, line) => {
    const wrapper = await mountCard(makeProduct(overrides))

    expect(wrapper.text()).toContain(line)
  })

  it('says nothing about stock while there is plenty', async () => {
    const wrapper = await mountCard(makeProduct({ stock: 11, lowStockThreshold: 0 }))

    expect(wrapper.text()).not.toContain('Μόνο')
  })

  it('offers a restock alert on a sold-out product only when the store sends them', async () => {
    expect((await mountCard(makeProduct({ stock: 0 }))).text()).not.toContain('Ειδοποίησέ με')

    flags.PRODUCT_ALERTS_ENABLED = true
    expect((await mountCard(makeProduct({ stock: 0 }))).text()).toContain('Ειδοποίησέ με όταν ξαναέρθει')
    expect((await mountCard(makeProduct({ stock: 9 }))).text()).not.toContain('Ειδοποίησέ με')
  })

  it('strikes through the pre-discount VAT-inclusive price, never the net price', async () => {
    // 100 € net, 24 % VAT, 10 % off: final 114 €, was 124 €.
    const wrapper = await mountCard(makeProduct({ price: 100, discountPercent: 10 }))

    expect(pricesOf(wrapper)).toEqual([money(114), money(124)])
    // The strike-through IS the contract: it is what says "was".
    expect(wrapper.find('.line-through').text()).toBe(money(124))
  })

  it('strikes nothing through on an undiscounted product', async () => {
    const wrapper = await mountCard(makeProduct({ price: 50 }))

    expect(pricesOf(wrapper)).toEqual([money(62)])
    expect(wrapper.find('.line-through').exists()).toBe(false)
  })

  it('swaps in a lower wholesale price with the retail price struck through', async () => {
    b2bPrice.mockImplementation(id => (id === 1 ? { finalPrice: '40' } : undefined))

    const wrapper = await mountCard(makeProduct({ price: 50 }))

    expect(pricesOf(wrapper)).toEqual([money(40), money(62)])
    expect(wrapper.find('.line-through').text()).toBe(money(62))
  })

  it('ignores a wholesale price that is not lower than retail', async () => {
    b2bPrice.mockImplementation(() => ({ finalPrice: '70' }))

    const wrapper = await mountCard(makeProduct({ price: 50 }))

    expect(pricesOf(wrapper)).toEqual([money(62)])
    expect(wrapper.find('.line-through').exists()).toBe(false)
  })

  it('links the whole card to the product page, named after the product', async () => {
    const wrapper = await mountCard(makeProduct({ id: 7, slug: 'glastra' }))

    const link = wrapper.get('a')
    expect(link.attributes('href')).toBe('/products/7/glastra')
    expect(link.attributes('aria-label')).toBe('Προβολή προϊόντος: Προϊόν 7')
    expect(link.find('h3').text()).toBe('Προϊόν 7')
  })

  it('links a search result by its master product id', async () => {
    const hit = { ...makeProduct({ id: 900, slug: 'glastra' }), master: 7 } as Product

    const wrapper = await mountCard(hit)

    expect(wrapper.get('a').attributes('href')).toBe('/products/7/glastra')
  })

  it('shows the rating out of five and the review count only once the product has reviews', async () => {
    const reviewed = await mountCard(makeProduct({ reviewAverage: 7, reviewCount: 12 }))
    const unreviewed = await mountCard(makeProduct({ reviewCount: 0 }))

    expect(reviewed.text()).toContain('3,5 · 12')
    expect(reviewed.find('[aria-label="Βαθμολογία 3,5 στα 5"]').exists()).toBe(true)
    expect(unreviewed.find('[aria-label^="Βαθμολογία"]').exists()).toBe(false)
  })
})
