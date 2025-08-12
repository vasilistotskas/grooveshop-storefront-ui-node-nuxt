export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserAccountProductReviewsData.shape.path.parse,
    )
    const query = await getValidatedQuery(event, zGetUserAccountProductReviewsData.shape.query.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/user/account/${params.id}/product_reviews`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
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
