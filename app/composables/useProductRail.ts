/**
 * The products behind a rail band, and whether there are any.
 *
 * Replaces the fixed `ordering=-createdAt` query the old slider carried:
 * its `useFetch` key was the constant `'productsSlider'`, so two rails on
 * one page shared a cache entry and showed the same products under two
 * headings.
 *
 * The SECTION owns this rather than the rail component, because a band
 * with nothing to show must not render its heading either — and a young
 * store cannot fill every rail a homepage carries.
 */
export type ProductRailOrdering
  = | 'featured'
    | 'newest'
    | 'popular'
    | 'discounted'
    | 'rating'

/**
 * Each of these is a real column or annotation on the product list, and
 * the viewset's `ordering_fields` must declare it or DRF drops the
 * parameter in silence — a rail would then render the default order
 * under a heading promising something else.
 *
 * Spelled in camelCase because that is the contract the API publishes:
 * `CamelCaseOrderingFilter` converts the value, and the generated query
 * schema validates it against a camelCase alternation, so a snake_case
 * value is rejected before it ever reaches Django.
 *
 * `featured` is the merchant's own arrangement, which is why it is the
 * default rather than recency.
 */
const ORDERING: Record<ProductRailOrdering, string> = {
  featured: '-viewCount',
  newest: '-createdAt',
  popular: '-likesCount',
  discounted: '-discountPercent',
  rating: '-reviewAverage',
}

export async function useProductRail(options: {
  pageSize: MaybeRefOrGetter<number>
  ordering: MaybeRefOrGetter<ProductRailOrdering>
  categoryId?: MaybeRefOrGetter<number | undefined>
}) {
  const { locale } = useI18n()

  const pageSize = computed(() => toValue(options.pageSize))
  const ordering = computed(() => toValue(options.ordering))
  const categoryId = computed(() => toValue(options.categoryId))

  const { data } = await useFetch('/api/products', {
    // The key carries everything that changes the answer; a constant
    // one is what made two rails show the same products.
    key: computed(
      () =>
        `product-rail-${ordering.value}-${categoryId.value ?? 'all'}-${pageSize.value}-${locale.value}`,
    ),
    query: computed(() => ({
      pageSize: pageSize.value,
      languageCode: locale.value,
      ordering: ORDERING[ordering.value] ?? ORDERING.featured,
      ...(categoryId.value ? { category: String(categoryId.value) } : {}),
      ...(ordering.value === 'discounted' ? { minDiscountPercent: 1 } : {}),
    })),
    // Two bands can resolve to the same key on one page; defer rather
    // than cancel, or each reader re-issues the request.
    dedupe: 'defer',
    // The band hydrates when it scrolls into view, after the app has
    // finished hydrating — see app/utils/payloadCachedData.ts.
    getCachedData: payloadCachedData,
  })

  const products = computed<Product[]>(() => data.value?.results ?? [])

  return {
    products,
    hasProducts: computed(() => products.value.length > 0),
  }
}
