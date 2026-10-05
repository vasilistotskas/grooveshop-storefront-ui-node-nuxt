/**
 * The products behind a hero's slides, by id.
 *
 * A slide's `productId` draws a chip (photograph, name, price) over its
 * artwork, so the hero needs those products before it renders. The
 * storefront has no batch product endpoint — `/api/products` filters on
 * ONE `id` — so the chips share one `useAsyncData` key and fetch the
 * product details together; each is a cached Nitro route
 * (`ProductDetailViewSet`), and the key carries the ids and the locale,
 * so a changed layout or language is a new answer.
 *
 * A product that cannot be read (deleted, hidden, a stale id in the
 * layout) is simply absent from the map: its slide renders without a
 * chip, and one bad id never costs the others theirs.
 */
export async function useHeroProductChips(ids: MaybeRefOrGetter<number[]>) {
  const { $i18n } = useNuxtApp()
  const requestFetch = useRequestApi()

  const wanted = computed(() => [...new Set(toValue(ids))].sort((a, b) => a - b))

  const { data } = await useAsyncData(
    () => `hero-product-chips-${$i18n.locale.value}-${wanted.value.join('-')}`,
    async () => {
      const settled = await Promise.allSettled(
        wanted.value.map(id => requestFetch<ProductRetrieve>(`/api/products/${id}`)),
      )
      const products: Record<number, ProductRetrieve> = {}
      for (const result of settled) {
        if (result.status === 'fulfilled') products[result.value.id] = result.value
      }
      return products
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
