import { ZodProductReview, ZodProductReviewCreateBody, ZodProductReviewCreateQuery } from '~/types/product/review'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const session = await getUserSession(event)
  try {
    const body = await readValidatedBody(event, ZodProductReviewCreateBody.parse)
    const query = await getValidatedQuery(
      event,
      ZodProductReviewCreateQuery.parse,
    )
    const url = buildFullUrl(`${config.public.apiBaseUrl}/product/review`, query)
    const response = await $fetch(url, {
      method: 'POST',
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
