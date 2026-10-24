import { getRouterParam, useRuntimeConfig } from 'nuxt/server'

/**
 * A product's price history: every period its consumer price held,
 * oldest first (Django's `ProductPriceSpell` rows), for the product
 * page's price trend. Django answers 404 when the store has the
 * `priceHistory` feature off.
 *
 * Cached per store and product; Django purges `product-price-history`
 * with the products surface whenever a price is recorded.
 */
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(event, zListProductPriceHistoryPath)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/product/${params.id}/price-history`,
      {
        method: 'GET',
        headers: createHeaders(event, null, null),
      },
    )
    return await parseDataAs(response, zListProductPriceHistoryResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'product-price-history',
  maxAge: 60 * 10,
  staleMaxAge: 60 * 60,
  swr: true,
  getKey: event => tenantCacheKey(event, `product-price-history:${getRouterParam(event, 'id', { decode: true })}`),
})
