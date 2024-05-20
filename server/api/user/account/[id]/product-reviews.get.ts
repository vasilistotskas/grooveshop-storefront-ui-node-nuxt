import { ZodPagination } from '~/types/pagination'
import { ZodProductReview, ZodProductReviewParams, ZodProductReviewQuery } from '~/types/product/review'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
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
