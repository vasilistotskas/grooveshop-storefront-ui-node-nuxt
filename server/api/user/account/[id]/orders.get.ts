import { ZodPagination } from '~/types/pagination'
import { ZodOrder, ZodOrderParams, ZodOrderQuery } from '~/types/order/order'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const accessToken = await getAllAuthAccessToken()
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
        Authorization: `Bearer ${accessToken}`,
      },
    })
    return await parseDataAs(response, ZodPagination(ZodOrder))
  }
  catch (error) {
    await handleError(error)
  }
})
