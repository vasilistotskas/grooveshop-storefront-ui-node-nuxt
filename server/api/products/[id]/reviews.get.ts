import * as z from 'zod'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodProductParams.parse)
    const query = await getValidatedQuery(event, ZodProductQuery.parse)
    const url = buildFullUrl(
      `${config.apiBaseUrl}/product/${params.id}/reviews`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, z.array(ZodProductReview))
  }
  catch (error) {
    await handleError(error)
  }
})
