export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, zPartialUpdateProductReviewBody.parse)
    const params = await getValidatedRouterParams(
      event,
      zPartialUpdateProductReviewPath.parse,
    )
    const query = await getValidatedQuery(event, zPartialUpdateProductReviewQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/product/review/${params.id}`, {
      method: 'PUT',
      body,
      query,
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
