import {
  ZodProductReview,
  ZodProductReviewParams,
  ZodProductReviewPutBody,
  ZodProductReviewPutQuery,
} from '~/types/product/review'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodProductReviewPutBody.parse)
    const params = await getValidatedRouterParams(
      event,
      ZodProductReviewParams.parse,
    )
    const query = await getValidatedQuery(event, ZodProductReviewPutQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/review/${params.id}`,
      query,
    )
    const response = await $fetch(url, {
      method: 'PUT',
      body,
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodProductReview)
  }
  catch (error) {
    await handleError(error)
  }
})
