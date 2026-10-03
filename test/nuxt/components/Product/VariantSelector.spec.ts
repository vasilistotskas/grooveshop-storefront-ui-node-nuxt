import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import type { ProductVariant, ProductVariantsResponse } from '~~/shared/openapi/types.gen'
import ProductVariantSelector from '~/components/Product/VariantSelector.vue'
import WebsideProductVariantSelector from '~/components/variants/webside/Product/VariantSelector.vue'
import { FIXTURE_TIMESTAMP } from '~~/test/fixtures/product'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const COLOUR = 1
const MEMORY = 2
const WHITE = 11
const BLACK = 12
const GB256 = 21
const GB512 = 22

const valueName: Record<number, string> = { [WHITE]: 'Λευκό', [BLACK]: 'Μαύρο', [GB256]: '256GB', [GB512]: '512GB' }

const attr = (attributeId: number, attributeValueId: number) => ({
  id: attributeId * 100 + attributeValueId,
  attributeId,
  attributeName: attributeId === COLOUR ? 'Χρώμα' : 'Μνήμη',
  attributeValueId,
  value: valueName[attributeValueId]!,
  createdAt: FIXTURE_TIMESTAMP,
})

const variant = (id: number, slug: string, finalPrice: number, colour: number, memory: number): ProductVariant => ({
  id,
  translations: { el: { name: `Προϊόν ${id}`, description: '' } },
  slug,
  active: true,
  stock: 5,
  price: finalPrice,
  finalPrice,
  discountPercent: 0,
  mainImagePath: `media/test-tenant/uploads/${colour === WHITE ? 'white' : 'black'}.jpg`,
  attributeValues: [attr(COLOUR, colour), attr(MEMORY, memory)],
})

/**
 * Two axes (Colour × Memory) over four sibling products; the product
 * on screen is p5 = Λευκό / 256GB. 256GB costs 10 € in both colours,
 * so only the values spanning two prices read "από".
 */
const response = (): ProductVariantsResponse => ({
  axes: [
    { id: COLOUR, name: 'Χρώμα', values: [{ id: WHITE, value: 'Λευκό' }, { id: BLACK, value: 'Μαύρο' }] },
    { id: MEMORY, name: 'Μνήμη', values: [{ id: GB256, value: '256GB' }, { id: GB512, value: '512GB' }] },
  ],
  variants: [
    variant(5, 'white-256', 10, WHITE, GB256),
    variant(6, 'black-256', 10, BLACK, GB256),
    variant(7, 'white-512', 15, WHITE, GB512),
    variant(8, 'black-512', 16, BLACK, GB512),
  ],
})

registerEndpoint('/api/products/5/variants', () => response())
registerEndpoint('/api/products/9/variants', () => ({
  axes: [],
  variants: [variant(9, 'solo', 5, WHITE, GB256)],
}))
// The same group with Μαύρο / 256GB sold out.
registerEndpoint('/api/products/15/variants', () => {
  const { axes, variants } = response()
  return { axes, variants: variants.map(v => (v.id === 6 ? { ...v, stock: 0 } : v.id === 5 ? { ...v, id: 15 } : v)) }
})

const hasText = (text: string) => (card: DOMWrapper<Element>) => card.text().includes(text)
const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

/** The frozen copy, pinned as it renders on webside.gr. */
describe('webside Product/VariantSelector', () => {
  const C = WebsideProductVariantSelector
  // ImgWithFallback wraps NuxtImg, which recurses under happy-dom's
  // reactive image sizing (it renders fine in the real app).
  const mountForProduct = async (id = 5) => {
    const wrapper = await mountSuspended(C, {
      props: { product: { id } as never },
      global: { stubs: { ImgWithFallback: { template: '<img data-testid="variant-image" />' } } },
    })
    await flushPromises()
    return wrapper
  }
  const card = (wrapper: Awaited<ReturnType<typeof mountForProduct>>, text: string) =>
    wrapper.findAll('[data-slot="item"]').find(hasText(text))!

  beforeEach(() => {
    clearNuxtData()
  })

  it('renders one labelled radio group per variant axis', async () => {
    const wrapper = await mountForProduct()

    expect(wrapper.findAll('[role="radiogroup"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Χρώμα:')
    expect(wrapper.text()).toContain('Μνήμη:')
    expect(wrapper.findAll('[data-slot="item"]').map(item => item.find('.truncate').text()))
      .toEqual(['Λευκό', 'Μαύρο', '256GB', '512GB'])
  })

  it('shows images only on the visually distinct axis (Colour), not Memory', async () => {
    const wrapper = await mountForProduct()

    expect(card(wrapper, 'Λευκό').find('img').exists()).toBe(true)
    expect(card(wrapper, '256GB').find('img').exists()).toBe(false)
  })

  it('prices each value at its cheapest sibling, with "από" only where it spans several prices', async () => {
    const wrapper = await mountForProduct()

    // Λευκό: 10 € (256GB) or 15 € (512GB); 256GB: 10 € in both colours.
    // One message with the price in it: a space between a separate "από"
    // and the price did not survive template compilation ("από10,00 €").
    const price = (text: string) => card(wrapper, text).find('.text-muted').text()
    expect(price('Λευκό')).toBe(`από ${money(10)}`)
    expect(price('256GB')).toBe(money(10))
    expect(price('512GB')).toBe(`από ${money(15)}`)
  })

  it('marks the values of the product on screen with a check', async () => {
    const wrapper = await mountForProduct()

    const checked = wrapper.findAll('[data-slot="item"]')
      .filter(item => item.find('.i-lucide\\:circle-check').exists())
      .map(item => item.find('.truncate').text())
    expect(checked).toEqual(['Λευκό', '256GB'])
  })

  it('navigates to the resolved sibling when picking another colour', async () => {
    const wrapper = await mountForProduct()

    // Memory stays 256GB → p6.
    await card(wrapper, 'Μαύρο').get('[role="radio"]').trigger('click')

    expect(navigateToMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/products/6/black-256')
  })

  it('keeps the other axis fixed when switching memory (multi-axis resolution)', async () => {
    const wrapper = await mountForProduct()

    // Colour stays Λευκό → p7 (white-512), not p8.
    await card(wrapper, '512GB').get('[role="radio"]').trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith('/products/7/white-512')
  })

  it('does not navigate when the current value is re-selected', async () => {
    const wrapper = await mountForProduct()

    await card(wrapper, 'Λευκό').get('[role="radio"]').trigger('click')

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  // Class strings ARE the contract here: Chromium lays <fieldset>
  // content out in an anonymous box that neither shrinks nor clips, so
  // overflow-x on the fieldset leaked and stretched the mobile page.
  it('scrolls via a wrapper div, never the radiogroup fieldset', async () => {
    const wrapper = await mountForProduct()

    const fieldsets = wrapper.findAll('fieldset')
    expect(fieldsets).toHaveLength(2)
    for (const fieldset of fieldsets) {
      expect(fieldset.classes()).not.toContain('overflow-x-auto')
      expect(fieldset.classes()).toContain('max-sm:w-max')
    }
    for (const group of wrapper.findAll('[role="radiogroup"]')) {
      const scroller = group.element.parentElement
      expect(scroller?.classList).toContain('max-sm:overflow-x-auto')
      expect(scroller?.classList).toContain('max-sm:snap-x')
    }
  })

  it('renders nothing when the product has no variant group', async () => {
    const wrapper = await mountForProduct(9)

    expect(wrapper.find('[data-testid="variant-selector"]').exists()).toBe(false)
  })
})

/**
 * The Groove Volt selector: a photo-swatch row for the axis whose
 * variants look different, a grid of cards (value and price) for any
 * other, one radio group per axis named by its legend.
 */
describe('default Product/VariantSelector', () => {
  const mountForProduct = async (id = 5) => {
    const wrapper = await mountSuspended(ProductVariantSelector, {
      props: { product: { id } as never },
      global: { stubs: { ImgWithFallback: { template: '<img data-testid="variant-image" />' } } },
    })
    await flushPromises()
    return wrapper
  }
  type Wrapper = Awaited<ReturnType<typeof mountForProduct>>
  const groups = (wrapper: Wrapper) => wrapper.findAll('[role="radiogroup"]')
  const radio = (wrapper: Wrapper, name: string) =>
    wrapper.findAll('[data-slot="item"]').find(hasText(name))!.get('[role="radio"]')

  beforeEach(() => {
    clearNuxtData()
  })

  it('names the photo axis by its chosen value and the card axis by itself', async () => {
    const wrapper = await mountForProduct()

    expect(wrapper.findAll('legend').map(legend => legend.text().replace(/\s+/g, ' ')))
      .toEqual(['Χρώμα: Λευκό', 'Μνήμη'])
    expect(groups(wrapper)).toHaveLength(2)
  })

  it('draws photo swatches on the distinct axis only, each named for assistive technology', async () => {
    const wrapper = await mountForProduct()
    const [colours, memory] = groups(wrapper)

    expect(colours!.findAll('[data-testid="variant-image"]')).toHaveLength(2)
    expect(colours!.findAll('span.sr-only').map(name => name.text())).toEqual(['Προϊόν 5', 'Προϊόν 6'])
    expect(memory!.find('[data-testid="variant-image"]').exists()).toBe(false)
  })

  it('prices each card at its cheapest sibling, with "από" only where it spans several prices', async () => {
    const wrapper = await mountForProduct()
    const memory = groups(wrapper)[1]!

    expect(memory.findAll('.font-mono').map(price => price.text())).toEqual([money(10), `από ${money(15)}`])
  })

  it('checks the values of the product on screen', async () => {
    const wrapper = await mountForProduct()

    expect(radio(wrapper, 'Προϊόν 5').attributes('aria-checked')).toBe('true')
    expect(radio(wrapper, '256GB').attributes('aria-checked')).toBe('true')
    expect(radio(wrapper, '512GB').attributes('aria-checked')).toBe('false')
  })

  it('opens the sibling with the other axis held, and nothing on the current value', async () => {
    const wrapper = await mountForProduct()

    await radio(wrapper, '512GB').trigger('click')
    expect(navigateToMock).toHaveBeenCalledWith('/products/7/white-512')

    navigateToMock.mockClear()
    await radio(wrapper, '256GB').trigger('click')
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it('keeps the shopper in their language when switching variant', async () => {
    const { $i18n } = useNuxtApp()
    const before = $i18n.locale.value
    $i18n.locale.value = 'en'
    try {
      const wrapper = await mountForProduct()

      // No English name on the variant: the value names the swatch.
      await radio(wrapper, 'Μαύρο').trigger('click')

      expect(navigateToMock).toHaveBeenCalledWith('/en/products/6/black-256')
    }
    finally {
      $i18n.locale.value = before
    }
  })

  it('says a sold-out value is sold out, and still offers it', async () => {
    const wrapper = await mountForProduct(15)

    const soldOut = wrapper.findAll('[data-slot="item"]').find(hasText('Προϊόν 6'))!
    expect(soldOut.text()).toContain('Εξαντλήθηκε')
    expect(soldOut.get('[role="radio"]').attributes('disabled')).toBeUndefined()
  })

  it('renders nothing when the product has no variant group', async () => {
    const wrapper = await mountForProduct(9)

    expect(wrapper.find('[data-testid="variant-selector"]').exists()).toBe(false)
  })
})
