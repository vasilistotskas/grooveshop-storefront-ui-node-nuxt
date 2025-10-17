export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCreateProductReviewData.shape.body.parse)
    const query = await getValidatedQuery(
      event,
      zCreateProductReviewData.shape.query.parse,
    )
    const response = await $fetch(`${config.apiBaseUrl}/product/review`, {
      method: 'POST',
      body,
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zCreateProductReviewResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
