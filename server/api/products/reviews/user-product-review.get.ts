export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const response = await $fetch(
      `${config.apiBaseUrl}/product/review/user_product_review`,
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
