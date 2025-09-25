export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zPartialUpdateProductReviewData.shape.body.parse)
    const params = await getValidatedRouterParams(
      event,
      zPartialUpdateProductReviewData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zPartialUpdateProductReviewData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/product/review/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'PUT',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zPartialUpdateProductReviewResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
