export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodProductReviewQuery.parse)
    const url = buildFullUrl(`${config.apiBaseUrl}/product/review`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodProductReview))
  }
  catch (error) {
    await handleError(error)
  }
})
