import { ZodProductReview, ZodProductReviewUserProductReviewBody } from '~/types/product/review'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
  try {
    const body = await readValidatedBody(
      event,
      ZodProductReviewUserProductReviewBody.parse,
    )
    const response = await $fetch(
      `${config.public.apiBaseUrl}/product/review/user_product_review`,
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
