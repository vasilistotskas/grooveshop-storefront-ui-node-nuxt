export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken(event)

  try {
    const params = getRouterParams(event)
    const productId = params.id

    const response = await $fetch(`${config.apiBaseUrl}/loyalty/product/${productId}/points`, {
      method: 'GET',
      headers: {
        ...(accessToken && {
          Authorization: `Bearer ${accessToken}`,
        }),
      },
    })

    return response
  }
  catch (error) {
    await handleError(error)
  }
})
