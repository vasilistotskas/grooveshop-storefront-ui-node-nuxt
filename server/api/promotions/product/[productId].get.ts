/**
 * Offers that apply to one product.
 *
 * Feeds the product page's offer panel. Same gating and the same
 * ``useBackendFetch`` requirement as the sibling ``/api/promotions``
 * listing: Promotion rows are per-tenant, and a raw ``$fetch`` carries
 * no ``X-Forwarded-Host``, so Django resolves the PUBLIC schema and
 * every tenant gets an empty list.
 *
 * Django answers 404 when either promotions gate is off OR the product
 * does not exist, so ``handleError`` propagates that and the panel
 * renders nothing rather than an error — a store with promotions
 * disabled is indistinguishable from one that never had the route.
 *
 * The file is named for ``productId``, not ``id``, so the generated
 * ``zListProductPromotionsPath`` validates the router params directly
 * — the param name comes from Django's ``<int:product_id>`` converter.
 *
 * Cached per tenant AND per product: the offer set is a function of
 * the promotion scopes, which change only when a merchant edits a
 * campaign. The Django ``promotions`` cache surface purges this handler
 * and the rendered ``/products`` pages on any promotion edit, so the
 * TTL is the backstop rather than the mechanism.
 */
export default defineCachedEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(
      event,
      zListProductPromotionsPath.parse,
    )
    const response = await useBackendFetch()(
      `${config.apiBaseUrl}/promotion/product/${params.productId}`,
      { method: 'GET' },
    )
    return await parseDataAs(response, zListProductPromotionsResponse)
  }
  catch (error) {
    handleError(error)
  }
}, {
  name: 'ProductPromotionList',
  // Matches the offers listing: an offer is a commercial commitment
  // with an end date, so serving a stale one means advertising a
  // discount the cart will refuse.
  maxAge: 60 * 5,
  staleMaxAge: 60 * 30,
  swr: true,
  getKey: event =>
    tenantCacheKey(
      event,
      `promotions:product:${getRouterParam(event, 'productId')}`,
    ),
})
