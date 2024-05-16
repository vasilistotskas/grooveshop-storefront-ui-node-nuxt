import type { H3Event } from 'h3'
import { ZodPagination } from '~/types/pagination'
import { ZodOrder, ZodOrderParams, ZodOrderQuery } from '~/types/order/order'

export default defineEventHandler(async (event: H3Event) => {
  const config = useRuntimeConfig()
  const session = await requireUserSession(event)
  try {
    const params = await getValidatedRouterParams(event, ZodOrderParams.parse)
    const query = await getValidatedQuery(event, ZodOrderQuery.parse)
    const url = buildFullUrl(
      `${config.public.apiBaseUrl}/user/account/${params.id}/orders`,
      query,
    )
    const response = await $fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${session?.token}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodOrder))
  }
  catch (error) {
    await handleError(error)
  }
})
