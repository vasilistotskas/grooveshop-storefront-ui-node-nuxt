import type { H3Event } from 'h3'

import { ZodProduct, ZodProductParams } from '~/types/product/product'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(event, ZodProductParams.parse)
  const response = await $fetch(
    `${config.public.apiBaseUrl}/product/${params.id}`,
    {
      method: 'GET',
    },
  )
  return await parseDataAs(response, ZodProduct)
})
