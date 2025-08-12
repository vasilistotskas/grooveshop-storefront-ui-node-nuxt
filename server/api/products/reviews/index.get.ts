export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, zListProductReviewData.shape.query.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/product/review`, query as any)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, zListProductReviewResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
