export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zListProductReviewsData.shape.path.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/${params.id}/reviews`, {
      method: 'GET',
    })
    return await parseDataAs(response, zListProductReviewsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
