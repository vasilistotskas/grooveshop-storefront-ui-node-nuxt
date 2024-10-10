import { array } from 'zod'
import { ZodProductImage } from '~/types/product/image'
import { ZodProductParams, ZodProductQuery } from '~/types/product'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const params = await getValidatedRouterParams(event, ZodProductParams.parse)
    const query = await getValidatedQuery(event, ZodProductQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/product/${params.id}/images`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, array(ZodProductImage))
  }
  catch (error) {
    await handleError(error)
  }
})
