import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountSuspended, registerEndpoint, mockNuxtImport } from '@nuxt/test-utils/runtime'
import { flushPromises } from '@vue/test-utils'
import type { DOMWrapper } from '@vue/test-utils'
import ProductVariantSelector from '~/components/Product/VariantSelector.vue'

const hasText = (text: string) => (c: DOMWrapper<Element>) => c.text().includes(text)

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

// Two axes (Colour × Memory) over four sibling products. Current product is
// p5 = Λευκό / 256GB.
const attr = (attributeId: number, attributeValueId: number, name: string, value: string) => ({
  id: attributeId * 100 + attributeValueId,
  attributeId,
  attributeName: name,
  attributeValueId,
  value,
  createdAt: '2026-01-01T00:00:00Z',
})

const variant = (
  id: number,
  slug: string,
  image: string,
  finalPrice: number,
  colourId: number,
  memoryId: number,
) => ({
  id,
  translations: { el: { name: `Προϊόν ${id}`, description: '' } },
  slug,
  active: true,
  stock: 5,
  price: finalPrice,
  finalPrice,
  discountPercent: 0,
  mainImagePath: image,
  attributeValues: [
    attr(1, colourId, 'Χρώμα', colourId === 11 ? 'Λευκό' : 'Μαύρο'),
    attr(2, memoryId, 'Μνήμη', memoryId === 21 ? '256GB' : '512GB'),
  ],
})

const buildResponse = () => ({
  axes: [
    {
      id: 1,
      name: 'Χρώμα',
      values: [
        { id: 11, value: 'Λευκό' },
        { id: 12, value: 'Μαύρο' },
      ],
    },
    {
      id: 2,
      name: 'Μνήμη',
      values: [
        { id: 21, value: '256GB' },
        { id: 22, value: '512GB' },
      ],
    },
  ],
  variants: [
    variant(5, 'white-256', 'media/uploads/white.jpg', 10, 11, 21),
    variant(6, 'black-256', 'media/uploads/black.jpg', 11, 12, 21),
    variant(7, 'white-512', 'media/uploads/white.jpg', 15, 11, 22),
    variant(8, 'black-512', 'media/uploads/black.jpg', 16, 12, 22),
  ],
})

// ImgWithFallback wraps NuxtImg, which recurses infinitely under happy-dom's
// reactive image-sizing in this test env (it renders fine in the real app), so
// stub it to a plain <img>. flushPromises lets the useFetch payload settle.
type Wrapper = Awaited<ReturnType<typeof mountSuspended>>
let mounted: Wrapper | undefined
const mountForProduct = async (id = 5): Promise<Wrapper> => {
  mounted = await mountSuspended(ProductVariantSelector, {
    props: { product: { id } as never },
    global: {
      stubs: { ImgWithFallback: { template: '<img data-testid="variant-image" />' } },
    },
  })
  await flushPromises()
  return mounted
}

describe('ProductVariantSelector', () => {
  beforeEach(() => {
    registerEndpoint('/api/products/5/variants', () => buildResponse())
  })

  afterEach(() => {
    mounted?.unmount()
    mounted = undefined
    vi.clearAllMocks()
  })

  it('renders one selector per variant axis', async () => {
    const wrapper = await mountForProduct()
    expect(wrapper.find('[data-testid="variant-selector"]').exists()).toBe(true)
    // Two axes → two radio groups.
    expect(wrapper.findAll('[role="radiogroup"]')).toHaveLength(2)
    expect(wrapper.text()).toContain('Χρώμα')
    expect(wrapper.text()).toContain('Μνήμη')
    expect(wrapper.text()).toContain('Λευκό')
    expect(wrapper.text()).toContain('256GB')
  })

  it('shows images only on the visually-distinct axis (Colour), not Memory', async () => {
    const wrapper = await mountForProduct()
    const cards = wrapper.findAll('[data-slot="item"]')
    // Colour values differ by image → rendered as image cards.
    const colourCard = cards.find(hasText('Λευκό'))
    expect(colourCard!.find('img').exists()).toBe(true)
    // Memory values share one image → rendered as text-only cards.
    const memoryCard = cards.find(hasText('256GB'))
    expect(memoryCard!.find('img').exists()).toBe(false)
  })

  it('navigates to the resolved sibling when picking another colour', async () => {
    const wrapper = await mountForProduct()
    // Find the Μαύρο card and select its radio; memory stays 256GB → p6.
    const cards = wrapper.findAll('[data-slot="item"]')
    const black = cards.find(hasText('Μαύρο'))
    expect(black).toBeTruthy()
    await black!.get('[role="radio"]').trigger('click')

    expect(navigateToMock).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith('/products/6/black-256')
  })

  it('keeps the other axis fixed when switching memory (multi-axis resolution)', async () => {
    const wrapper = await mountForProduct()
    // Pick 512GB; colour stays Λευκό → p7 (white-512), not p8.
    const cards = wrapper.findAll('[data-slot="item"]')
    const bigMemory = cards.find(hasText('512GB'))
    await bigMemory!.get('[role="radio"]').trigger('click')

    expect(navigateToMock).toHaveBeenCalledWith('/products/7/white-512')
  })

  it('does not navigate when the current value is re-selected', async () => {
    const wrapper = await mountForProduct()
    const cards = wrapper.findAll('[data-slot="item"]')
    const currentColour = cards.find(hasText('Λευκό'))
    await currentColour!.get('[role="radio"]').trigger('click')
    expect(navigateToMock).not.toHaveBeenCalled()
  })
})

describe('ProductVariantSelector — no group', () => {
  beforeEach(() => {
    registerEndpoint('/api/products/9/variants', () => ({
      axes: [],
      variants: [
        {
          id: 9,
          translations: { el: { name: 'Μόνο', description: '' } },
          slug: 'solo',
          active: true,
          stock: 1,
          price: 5,
          finalPrice: 5,
          discountPercent: 0,
          mainImagePath: 'media/uploads/solo.jpg',
          attributeValues: [],
        },
      ],
    }))
  })

  it('renders nothing when the product has no variant group', async () => {
    const wrapper = await mountForProduct(9)
    expect(wrapper.find('[data-testid="variant-selector"]').exists()).toBe(false)
  })
})
