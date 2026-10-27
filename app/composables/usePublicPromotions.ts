/**
 * The promotions a shopper can read about before building a cart, for the
 * `/offers` page and for the product page's offer panel (`Storefront/Offers.vue`,
 * `Product/Offers.vue` and the tenants' own). How a row reads (headline,
 * conditions, expiry) is `usePromotionOffer`'s.
 *
 * `languageCode` is not optional in practice: Django resolves an offer's
 * name and description server-side, so without it the page renders the
 * store's default language whatever locale it is on. The key carries the
 * locale too, or the first one fetched would be reused for the other.
 */

/** Every live public promotion of the store. */
export function usePublicPromotions() {
  const { locale } = useNuxtApp().$i18n

  return useApi('/api/promotions', {
    key: () => `public-offers-${locale.value}`,
    headers: useRequestHeaders(),
    query: { languageCode: locale },
    default: () => [],
  })
}

/**
 * The offers that matter to one product, split into those about the item
 * itself (it is named, given away or in a targeted category) and the
 * store-wide ones, which are true of every product and so are context
 * rather than news.
 *
 * Two-tier gate, fail CLOSED: the REQUEST is gated on the store's
 * `promotions` feature, not just the render. Django answers 404 for a
 * store without promotions, a wasted round trip on the hot product page
 * (58 of them in six hours on webside.gr). `default` still covers the
 * enabled-but-empty case.
 */
export async function useProductPromotions(productId: MaybeRefOrGetter<number>) {
  const { locale } = useNuxtApp().$i18n
  const promotionsEnabled = useStoreFeature('promotions')

  const { data: offers } = await useApi(
    () => `/api/promotions/product/${toValue(productId)}`,
    {
      key: () => `product-offers-${toValue(productId)}-${locale.value}`,
      headers: useRequestHeaders(),
      query: { languageCode: locale },
      default: () => [],
      enabled: promotionsEnabled,
    },
  )

  const rows = computed(() => (promotionsEnabled.value ? offers.value ?? [] : []))

  const specific = computed(() => rows.value.filter(o => o.relation !== 'ORDER'))
  const storeWide = computed(() => rows.value.filter(o => o.relation === 'ORDER'))

  /** The header counts what the card lists open. */
  const openCount = computed(() => specific.value.length || storeWide.value.length)

  return { rows, specific, storeWide, openCount }
}
