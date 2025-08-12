export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zCreateProductReviewData.shape.body.parse)
    const query = await getValidatedQuery(
      event,
      zCreateProductReviewData.shape.query.parse,
    )
    const url = buildFullUrl(`${config.apiBaseUrl}/product/review`, query)
    const response = await $fetch(url, {
      method: 'POST',
      body,
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
