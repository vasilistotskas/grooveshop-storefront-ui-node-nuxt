export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const params = await getValidatedRouterParams(event, zGetProductLoyaltyPointsData.shape.path.parse)
    const productId = params.id

    const response = await $fetch(`${config.apiBaseUrl}/loyalty/product/${productId}/points`, {
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
    await handleError(error)
  }
})
