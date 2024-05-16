import { ZodPagination } from '~/types/pagination'
import { ZodProductImage, ZodProductImageQuery } from '~/types/product/image'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodProductImageQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/product/image`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodProductImage))
  }
  catch (error) {
    await handleError(error)
  }
})
