export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountProductReviewsPath.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountProductReviewsQuery.parse)
    const response = await $fetch(`${config.apiBaseUrl}/user/account/${params.id}/product_reviews`, {
      method: 'GET',
      query,
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, zGetUserAccountProductReviewsResponse)
  }
  catch (error) {
    await handleError(error)
  }
})
