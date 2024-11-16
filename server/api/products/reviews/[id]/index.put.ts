export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(event, ZodProductReviewPutBody.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodProductReviewParams.parse,
    )
    const query = await getValidatedQuery(event, ZodProductReviewPutQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/review/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'PUT',
      body,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodProductReview)
  }
  catch (error) {
    await handleError(error)
  }
})
