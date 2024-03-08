import type { H3Event } from 'h3'

import { ZodPagination } from '~/types/pagination'
import { ZodProductImage, ZodProductImageQuery } from '~/types/product/image'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const query = await getValidatedQuery(event, ZodProductImageQuery.parse)
  const url = buildFullUrl(`${config.public.apiBaseUrl}/product/image`, query)
  const response = await $fetch(url, {
    method: 'GET',
  })
  return await parseDataAs(response, ZodPagination(ZodProductImage))
})
