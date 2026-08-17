import { FetchError } from 'ofetch'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await requireAllAuthAccessToken()
  try {
    const params = await getValidatedRouterParams(
      event,
      zGetUserProductReviewPath.parse,
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
  catch (error) {
    // 404 is the expected "user has no review for this product" answer.
    // Anything else (Django 5xx, network failure, schema mismatch) must
    // NOT be silently presented as "no review" — let it propagate/log.
    if (error instanceof FetchError && error.statusCode === 404) {
      return null
    }
    handleError(error)
  }
})
