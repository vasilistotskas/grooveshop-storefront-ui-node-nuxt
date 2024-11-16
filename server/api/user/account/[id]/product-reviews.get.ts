export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      ZodProductReviewParams.parse,
    )
    const query = await getValidatedQuery(event, ZodProductReviewQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/user/account/${params.id}/product_reviews`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodProductReview))
  }
  catch (error) {
    await handleError(error)
  }
})
