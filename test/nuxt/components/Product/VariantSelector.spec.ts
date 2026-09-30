import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import type { ProductVariant, ProductVariantsResponse } from '~~/shared/openapi/types.gen'
import ProductVariantSelector from '~/components/Product/VariantSelector.vue'
import WebsideProductVariantSelector from '~/components/variants/webside/Product/VariantSelector.vue'
import { FIXTURE_TIMESTAMP } from '~~/test/fixtures/product'
import { trees } from '~~/test/helpers/trees'

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

const hasText = (text: string) => (card: DOMWrapper<Element>) => card.text().includes(text)
const money = (value: number) => useNuxtApp().$i18n.n(value, 'currency')

describe.each(trees(ProductVariantSelector, WebsideProductVariantSelector))('$tree Product/VariantSelector', ({ tree, C }) => {
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
    // Prefix and price are asserted apart: the template's space between
    // them does not survive compilation (reported, not pinned).
    const price = (text: string) => card(wrapper, text).find('.text-muted').text()
    expect(price('Λευκό')).toMatch(/^από\s?/)
    expect(price('Λευκό').replace(/^από\s?/, '')).toBe(money(10))
    expect(price('256GB')).toBe(money(10))
    expect(price('512GB')).toMatch(/^από\s?/)
    expect(price('512GB').replace(/^από\s?/, '')).toBe(money(15))
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

  // The frozen copy navigates to the bare path; webside.gr serves Greek only.
  it.runIf(tree === 'default')('keeps the shopper in their language when switching variant', async () => {
    const { $i18n } = useNuxtApp()
    const before = $i18n.locale.value
    $i18n.locale.value = 'en'
    try {
      const wrapper = await mountForProduct()

      await card(wrapper, 'Μαύρο').get('[role="radio"]').trigger('click')

      expect(navigateToMock).toHaveBeenCalledWith('/en/products/6/black-256')
    }
    finally {
      $i18n.locale.value = before
    }
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
