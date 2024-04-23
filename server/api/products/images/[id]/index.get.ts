import type { H3Event } from 'h3'

import { ZodProductImage, ZodProductImageParams, ZodProductImageQuery } from '~/types/product/image'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(event, ZodProductImageParams.parse)
  const query = await getValidatedQuery(event, ZodProductImageQuery.parse)
  const url = buildFullUrl(
    `${config.public.apiBaseUrl}/product/image/${params.id}`,
    query,
  )
  const response = await $fetch(url, {
    method: 'GET',
  })
  return await parseDataAs(response, ZodProductImage)
})
