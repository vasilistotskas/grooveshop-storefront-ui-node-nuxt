export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, zListProductReviewsData.shape.path.parse)
    const query = await getValidatedQuery(event, zListProductReviewsData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/product/${params.id}/reviews`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListProductReviewsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
