import type { H3Event } from 'h3'

import {
  ZodProductCategory,
  ZodProductCategoryParams,
} from '~/types/product/category'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const params = await getValidatedRouterParams(
    event,
    ZodProductCategoryParams.parse,
  )
  const response = await $fetch(
    `${config.public.apiBaseUrl}/product/category/${params.id}`,
    {
      method: 'GET',
    },
  )
  return await parseDataAs(response, ZodProductCategory)
})
