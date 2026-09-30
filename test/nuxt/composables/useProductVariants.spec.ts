/**
 * Picking a value on one axis navigates to a sibling product, keeping
 * the other axes where they are when that combination exists and
 * falling back to the closest sibling when it does not. The value cards
 * show the lowest price across the siblings carrying the value, with an
 * "από" prefix when those prices differ.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import type { ProductVariant, ProductVariantsResponse } from '~~/shared/openapi/types.gen'
import { FIXTURE_TIMESTAMP } from '~~/test/fixtures/product'

const api = await vi.hoisted(async () => (await import('~~/test/helpers/api')).createApiMock())
mockNuxtImport('$api', () => api)
mockNuxtImport('$fetch', () => api)

const COLOUR = 1
const RED = 10
const BLUE = 11
const MEMORY = 2
const GB64 = 20
const GB128 = 21

function variant(id: number, values: Record<number, number>, finalPrice: number, mainImagePath: string): ProductVariant {
  return {
    id,
    translations: { el: { name: `Κινητό ${id}` } },
    slug: `phone-${id}`,
    active: true,
    stock: 5,
    price: finalPrice,
    finalPrice,
    discountPercent: 0,
    mainImagePath,
    attributeValues: Object.entries(values).map(([attributeId, attributeValueId]) => ({
      id: id * 10 + Number(attributeId),
      attributeId: Number(attributeId),
      attributeName: '',
      attributeValueId,
      value: '',
      createdAt: FIXTURE_TIMESTAMP,
    })),
  }
}

/** Red in 64/128 GB, blue in 64 GB only — blue/128 does not exist. */
const PHONES: ProductVariantsResponse = {
  axes: [
    { id: COLOUR, name: 'Χρώμα', values: [{ id: RED, value: 'Κόκκινο' }, { id: BLUE, value: 'Μπλε' }] },
    { id: MEMORY, name: 'Μνήμη', values: [{ id: GB64, value: '64GB' }, { id: GB128, value: '128GB' }] },
  ],
  // Blue/64 is listed before red/64 so a "first candidate" shortcut
  // would pick the wrong colour.
  variants: [
    variant(103, { [COLOUR]: BLUE, [MEMORY]: GB64 }, 520, 'blue.jpg'),
    variant(101, { [COLOUR]: RED, [MEMORY]: GB64 }, 500, 'red.jpg'),
    variant(102, { [COLOUR]: RED, [MEMORY]: GB128 }, 600, 'red.jpg'),
  ],
}

describe('useProductVariants', () => {
  beforeEach(() => {
    clearNuxtData()
    api.routes({ '/api/products/*': PHONES })
  })

  it('fetches the viewed product\'s variant group', async () => {
    await useProductVariants(102)

    expect(api.callsTo('/api/products/*').map(call => call.url)).toEqual(['/api/products/102/variants'])
  })

  it('selects the viewed product\'s value on each axis', async () => {
    const { currentVariant, currentValueFor, isCurrentValue } = await useProductVariants(102)

    expect(currentVariant.value?.id).toBe(102)
    expect(currentValueFor(COLOUR)).toBe(RED)
    expect(isCurrentValue(MEMORY, GB128)).toBe(true)
    expect(isCurrentValue(MEMORY, GB64)).toBe(false)
  })

  it('keeps the other axes when switching one, choosing the sibling that matches them', async () => {
    const { resolveTarget } = await useProductVariants(102)

    // On red/128, picking 64 GB must stay red.
    expect(resolveTarget(MEMORY, GB64)?.id).toBe(101)
  })

  it('falls back to the sibling carrying the value when the exact combination does not exist', async () => {
    const { resolveTarget, variantForValue } = await useProductVariants(102)

    // Blue/128 does not exist: blue/64 is the only blue.
    expect(resolveTarget(COLOUR, BLUE)?.id).toBe(103)
    expect(variantForValue(COLOUR, BLUE)?.id).toBe(103)
  })

  it('resolves nothing for a value no sibling carries', async () => {
    const { resolveTarget, minPriceForValue } = await useProductVariants(102)

    expect(resolveTarget(COLOUR, 999)).toBeUndefined()
    expect(minPriceForValue(COLOUR, 999)).toBeUndefined()
  })

  it('prices a value card at its cheapest sibling, flagged as a range when prices differ', async () => {
    const { minPriceForValue, valueHasPriceRange } = await useProductVariants(102)

    expect(minPriceForValue(COLOUR, RED)).toBe(500)
    expect(valueHasPriceRange(COLOUR, RED)).toBe(true)
    expect(minPriceForValue(COLOUR, BLUE)).toBe(520)
    expect(valueHasPriceRange(COLOUR, BLUE)).toBe(false)
  })

  it('renders image cards only for an axis whose values look different', async () => {
    const { axisHasDistinctImages } = await useProductVariants(102)

    expect(axisHasDistinctImages(COLOUR)).toBe(true)
    // Both memory cards resolve to a red phone: same image.
    expect(axisHasDistinctImages(MEMORY)).toBe(false)
    expect(axisHasDistinctImages(999)).toBe(false)
  })

  it.each([
    ['more than one sibling on an axis', PHONES, true],
    ['a single sibling', { ...PHONES, variants: PHONES.variants.slice(0, 1) }, false],
    ['no axes', { ...PHONES, axes: [] }, false],
  ])('offers a selector only with %s', async (_case, response, expected) => {
    api.routes({ '/api/products/*': response })

    const { hasVariants } = await useProductVariants(102)

    expect(hasVariants.value).toBe(expected)
  })

  it('has no selection when the viewed product is not in its own group', async () => {
    const { currentVariant, currentValueFor } = await useProductVariants(999)

    expect(currentVariant.value).toBeUndefined()
    expect(currentValueFor(COLOUR)).toBeUndefined()
  })
})
