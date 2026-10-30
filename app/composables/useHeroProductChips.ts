/**
 * The products behind a hero's slides, by id.
 *
 * A slide's `productId` draws a chip (photograph, name, price) over its
 * artwork, so the hero needs those products before it renders. They
 * come in ONE request: the product list filtered by id (`id_In`), a
 * cached Nitro route (`ProductViewSet`) answering product cards, which
 * carry everything a chip draws. The key carries the ids and the locale,
 * so a changed layout or language is a new answer.
 *
 * A product the list does not serve (deleted, inactive, a stale id in
 * the layout) is simply absent from the map: its slide renders without a
 * chip, and one bad id never costs the others theirs. A failed request
 * (a 5xx, the network) is logged and fails the fetch, so the hero still
 * renders without chips but a transient fault is never stored as the
 * answer in the page payload or the page cache.
 */
export async function useHeroProductChips(ids: MaybeRefOrGetter<number[]>) {
  const { $i18n } = useNuxtApp()
  const requestFetch = useRequestApi()
  const catalogueEnabled = useStoreFeature('catalogue')

  // A store without the catalogue wants no product: no chip is drawn and
  // no request is made.
  const wanted = computed(() => catalogueEnabled.value
    ? [...new Set(toValue(ids))].sort((a, b) => a - b)
    : [])

  const { data } = await useAsyncData(
    () => `hero-product-chips-${$i18n.locale.value}-${wanted.value.join('-')}`,
    async () => {
      const products: Record<number, ProductCard> = {}
      if (!wanted.value.length) return products
      try {
        const page = await requestFetch<PaginatedProductCardList>('/api/products', {
          query: { id_In: wanted.value.join(','), pageSize: wanted.value.length },
        })
        for (const product of page.results) products[product.id] = product
        return products
      }
      catch (error) {
        log.warn({
          tag: 'hero-product-chips',
          message: 'product fetch failed',
          productIds: wanted.value,
          status: (error as { statusCode?: number })?.statusCode,
        })
        throw error
      }
    },
    {
      // The hero hydrates with the page, but sections can hydrate lazily
      // (see app/utils/payloadCachedData.ts), and two readers of one key
      // join the fetch in flight.
      dedupe: 'defer',
      getCachedData: payloadCachedData,
    },
  )

  return computed(() => data.value ?? {})
}
