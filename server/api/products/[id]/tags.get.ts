import { z } from 'zod'
import { ZodProductParams, ZodProductQuery } from '~/types/product/product'
import { ZodTag } from '~/types/tag'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodProductParams.parse)
    const query = await getValidatedQuery(event, ZodProductQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/${params.id}/tags`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, z.array(ZodTag))
  }
  catch (error) {
    await handleError(error)
  }
})
