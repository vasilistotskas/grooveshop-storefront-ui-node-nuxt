import { array } from 'zod'
import { ZodProductParams, ZodProductQuery } from '~/types/product'
import { ZodProductReview } from '~/types/product/review'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodProductParams.parse)
    const query = await getValidatedQuery(event, ZodProductQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/${params.id}/reviews`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, array(ZodProductReview))
  }
  catch (error) {
    await handleError(error)
  }
})
