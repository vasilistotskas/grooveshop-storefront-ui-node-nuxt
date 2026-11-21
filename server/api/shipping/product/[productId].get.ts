import { getRouterParam, useRuntimeConfig } from 'nuxt/server'

/**
 * What shipping one product costs bought on its own: the product page's
 * "shipping from X" line (`useProductAssurances`).
 *
 * Django prices it as checkout would price a cart holding that product
 * alone (`GET /shipping/product/<product_id>`): to the store's first
 * shipping country, after its free-shipping threshold and the automatic
 * promotions, leaving out every delivery that cannot carry it. `estimate`
 * is `null` when the store ships nowhere or no delivery can take it; 404
 * for a missing or inactive product.
 *
 * The file is named for `productId`, the param Django's
 * `<int:product_id>` converter gives the generated path schema.
 *
 * The same answer for every visitor, so cached per store and product, with
 * no language: the payload carries no prose. Django's `shipping`,
 * `products` and `promotions` surfaces all purge `shipping.product`, since
 * a rate, the product and a promotion each move it; the TTL is the
 * backstop.
 */
export default defineCachedRoute(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await parseRouterParams(event, zGetProductShippingPath)
    const response = await useBackendFetch(event)(
      `${config.apiBaseUrl}/shipping/product/${params.productId}`,
      {
        method: 'GET',
        headers: createHeaders(event, null, null),
      },
    )
    return await parseDataAs(response, zGetProductShippingResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
}, {
  name: 'shipping.product',
  maxAge: 60 * 5,
  staleMaxAge: 60 * 30,
  swr: true,
  getKey: event =>
    tenantCacheKey(
      event,
      `shipping-product:${getRouterParam(event, 'productId', { decode: true })}`,
    ),
})
