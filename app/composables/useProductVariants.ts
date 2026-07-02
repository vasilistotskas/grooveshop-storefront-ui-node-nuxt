/**
 * Fetches a product's variant group (sibling products + the axes to render as
 * selectors) and exposes the resolution logic the UI needs:
 *
 * - which value is currently selected on each axis (derived from the product
 *   being viewed),
 * - which sibling to navigate to when a value is picked (multi-axis aware),
 * - the representative image and "από" (from) price for each value card.
 *
 * Each variant is a full product with its own URL, so selecting a value is a
 * navigation, not an in-place mutation — see `Product/VariantSelector.vue`.
 *
 * Async on purpose: awaiting the fetch lets the selector render during SSR
 * (present in the HTML, no layout shift when it appears).
 */
export const useProductVariants = async (
  productId: MaybeRefOrGetter<number>,
) => {
  const id = computed(() => toValue(productId))

  const { data, status, error } = await useFetch<ProductVariantsResponse>(
    () => `/api/products/${id.value}/variants`,
    {
      key: () => `product-variants-${id.value}`,
      default: () => ({ axes: [], variants: [] }),
    },
  )

  const axes = computed(() => data.value?.axes ?? [])
  const variants = computed(() => data.value?.variants ?? [])

  // A selector is only meaningful when there is more than one sibling to choose
  // between and at least one axis to choose on.
  const hasVariants = computed(
    () => axes.value.length > 0 && variants.value.length > 1,
  )

  // attributeId -> attributeValueId for one variant product.
  const valueMapFor = (variant: ProductVariant): Map<number, number> => {
    const map = new Map<number, number>()
    for (const av of variant.attributeValues) {
      map.set(av.attributeId, av.attributeValueId)
    }
    return map
  }

  const currentVariant = computed(() =>
    variants.value.find(v => v.id === id.value),
  )

  const currentSelection = computed<Map<number, number>>(() =>
    currentVariant.value ? valueMapFor(currentVariant.value) : new Map(),
  )

  const currentValueFor = (axisId: number): number | undefined =>
    currentSelection.value.get(axisId)

  const isCurrentValue = (axisId: number, valueId: number): boolean =>
    currentValueFor(axisId) === valueId

  const variantsWithValue = (
    axisId: number,
    valueId: number,
  ): ProductVariant[] =>
    variants.value.filter(v => valueMapFor(v).get(axisId) === valueId)

  /**
   * The sibling to navigate to when picking `valueId` on `axisId`: keep the
   * other axes at their current values and switch only this one. Prefers an
   * exact match on the other axes, then falls back to the closest sibling that
   * at least carries `valueId` (so a non-existent combination still resolves to
   * something sensible).
   */
  const resolveTarget = (
    axisId: number,
    valueId: number,
  ): ProductVariant | undefined => {
    const candidates = variantsWithValue(axisId, valueId)
    if (candidates.length <= 1) return candidates[0]

    const otherAxes = axes.value.filter(a => a.id !== axisId)
    let best = candidates[0]
    let bestScore = -1
    for (const candidate of candidates) {
      const map = valueMapFor(candidate)
      let score = 0
      for (const axis of otherAxes) {
        const current = currentValueFor(axis.id)
        if (current !== undefined && map.get(axis.id) === current) score += 1
      }
      if (score > bestScore) {
        bestScore = score
        best = candidate
      }
    }
    return best
  }

  // Representative sibling for a value card (its image + price).
  const variantForValue = (
    axisId: number,
    valueId: number,
  ): ProductVariant | undefined =>
    resolveTarget(axisId, valueId) ?? variantsWithValue(axisId, valueId)[0]

  // Lowest final price across the siblings carrying a value — the "από" price
  // on a card when the value spans several combinations (e.g. a colour that
  // exists in several memory sizes).
  const minPriceForValue = (
    axisId: number,
    valueId: number,
  ): number | undefined => {
    const prices = variantsWithValue(axisId, valueId)
      .map(v => v.finalPrice)
      .filter((p): p is number => typeof p === 'number')
    return prices.length ? Math.min(...prices) : undefined
  }

  // Whether a value maps to more than one price → show the "από" (from) prefix.
  const valueHasPriceRange = (axisId: number, valueId: number): boolean => {
    const prices = new Set(
      variantsWithValue(axisId, valueId).map(v => v.finalPrice),
    )
    return prices.size > 1
  }

  // Whether an axis's values map to visually distinct images (Colour) versus
  // sharing one image (Memory). Drives image-card vs text-card rendering with
  // no hardcoded attribute names.
  const axisHasDistinctImages = (axisId: number): boolean => {
    const axis = axes.value.find(a => a.id === axisId)
    if (!axis) return false
    const images = new Set<string>()
    for (const value of axis.values) {
      const image = variantForValue(axisId, value.id)?.mainImagePath
      if (image) images.add(image)
    }
    return images.size > 1
  }

  return {
    status,
    error,
    axes,
    variants,
    hasVariants,
    currentVariant,
    currentValueFor,
    isCurrentValue,
    variantForValue,
    resolveTarget,
    minPriceForValue,
    valueHasPriceRange,
    axisHasDistinctImages,
  }
}
