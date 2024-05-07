import type { H3Event } from 'h3'
import { z } from 'zod'
import { ZodProductImage } from '~/types/product/image'
import { ZodProductParams, ZodProductQuery } from '~/types/product/product'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(event, ZodProductParams.parse)
  const query = await getValidatedQuery(event, ZodProductQuery.parse)
  const url = buildFullUrl(
    `${config.public.apiBaseUrl}/product/${params.id}/images`,
    query,
  )
  const response = await $fetch(url, {
    method: 'GET',
  })
  return await parseDataAs(response, z.array(ZodProductImage))
})
