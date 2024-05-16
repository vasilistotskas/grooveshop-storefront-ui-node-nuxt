import type { H3Event } from 'h3'
import { z } from 'zod'
import { ZodProductParams, ZodProductQuery } from '~/types/product/product'
import { ZodProductReview } from '~/types/product/review'

export default defineEventHandler(async (event: H3Event) => {
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
    return await parseDataAs(response, z.array(ZodProductReview))
  }
  catch (error) {
    await handleError(error)
  }
})
