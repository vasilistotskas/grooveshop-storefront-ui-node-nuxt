export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductReviewQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/review`, {
      method: 'GET',
      query,
    })
    return await parseDataAs(response, zListProductReviewResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
