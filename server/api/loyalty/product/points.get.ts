import { defineEventHandler, getValidatedQuery, useRuntimeConfig } from 'nuxt/server'

/**
 * The points each product earns the signed-in shopper, for a whole cart
 * in one request. Per user and per tier, so never cached.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken(event)
  try {
    const query = await getValidatedQuery(event, zGetProductsLoyaltyPointsQuery)
    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/loyalty/product/points`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetProductsLoyaltyPointsResponse)
  }
  catch (error) {
    return handleError(event, error)
  }
})
