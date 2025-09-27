export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserProductReviewData.shape.path.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/review/${params.id}/user_product_review`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, zProductReviewDetail)
  }
  catch {
    // User has no review for this product
    return null
  }
})
