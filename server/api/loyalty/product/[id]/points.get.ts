import { defineEventHandler, useRuntimeConfig } from 'nuxt/server'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const params = await parseRouterParams(event, zGetProductLoyaltyPointsPath)
    const productId = params.id

    const response = await useBackendFetch(event)(`${config.apiBaseUrl}/loyalty/product/${productId}/points`, {
      method: 'GET',
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return await parseDataAs(response, zGetProductLoyaltyPointsResponse)
  }
  catch (error) {
    handleError(event, error)
  }
})
