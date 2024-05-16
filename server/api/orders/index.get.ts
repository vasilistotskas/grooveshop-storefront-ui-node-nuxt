import type { H3Event } from 'h3'

import { ZodOrder, ZodOrderQuery } from '~/types/order/order'
import { ZodPagination } from '~/types/pagination'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  try {
    const query = await getValidatedQuery(event, ZodOrderQuery.parse)
    const url = buildFullUrl(`${config.public.apiBaseUrl}/order`, query)
    const response = await $fetch(url, {
      method: 'GET',
    })
    return await parseDataAs(response, ZodPagination(ZodOrder))
  }
  catch (error) {
    await handleError(error)
  }
})
