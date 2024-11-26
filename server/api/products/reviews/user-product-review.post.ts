export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      ZodProductReviewUserProductReviewBody.parse,
    )
    const response = await $fetch(
      `${config.apiBaseUrl}/product/review/user_product_review`,
      {
        method: 'POST',
        body,
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    )
    return await parseDataAs(response, ZodProductReview)
  }
  catch (error) {
    await handleError(error)
  }
})
