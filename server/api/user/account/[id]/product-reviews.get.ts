import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { ZodProductReview, ZodProductReviewParams, ZodProductReviewQuery } from '~/types/product/review'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
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
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodProductReview))
  }
  catch (error) {
    await handleError(error)
  }
})
